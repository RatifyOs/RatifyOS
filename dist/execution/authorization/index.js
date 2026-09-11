import { randomUUID } from "node:crypto";
import { AUTHORIZATION_PROTOCOL, SignerWireVerifier, canonicalClaims, } from "../../signer/authorization.js";
import { decodeTransaction } from "../../signer/transaction.js";
import { simulationEvidenceHash, simulationRequestOf, } from "../simulation.js";
/**
 * Issuing side of the custody boundary.
 *
 * The claim types are imported from `src/signer/authorization.js` rather than
 * redeclared here. The signer decodes the transaction itself and refuses to
 * sign unless its decode and these claims agree field for field, so any
 * divergence between the two shapes is a runtime rejection at best and a
 * silently unenforced check at worst. Sharing one declaration makes it a
 * compile error instead.
 *
 * One envelope binds one operator decision to one exact transaction: the wire
 * bytes, the message bytes an Ed25519 signature commits to, every program id,
 * every static account key, every instruction's data, and the recent blockhash
 * with the block height past which it dies.
 */
export { AUTHORIZATION_PROTOCOL, canonicalClaims, InMemoryReplayStore, } from "../../signer/authorization.js";
export * from "./wire.js";
export class AuthorizationIssuer {
    dependencies;
    get signerKeyId() {
        return this.dependencies.signerKeyId;
    }
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async issue(r, e, refs) {
        const ttl = this.dependencies.ttlMs ?? 30_000;
        if (!Number.isSafeInteger(ttl) ||
            ttl <= 0 ||
            ttl > (this.dependencies.maxTtlMs ?? 60_000))
            throw Error("authorization_ttl_invalid");
        if (refs.policyHash !== r.policyHash)
            throw Error("authorization_policy_invalid");
        // Re-decode the persisted bytes. A quote survives restarts on disk, so the
        // projection it carries is re-derived here rather than trusted.
        const decoded = decodeTransaction(r.transaction);
        if (JSON.stringify(simulationRequestOf(decoded, r.cluster, r.lastValidBlockHeight, r.policyHash)) !== JSON.stringify(r))
            throw Error("authorization_transaction_invalid");
        const { hash, ...body } = e;
        if (hash !== simulationEvidenceHash(body) ||
            e.messageHash !== r.messageHash)
            throw Error("authorization_simulation_invalid");
        const c = this.dependencies.checks, start = await c.snapshotVersion?.();
        const validations = [
            ["quote", c.quote(refs.quoteHash)],
            ["policy", c.policy(refs.policyHash)],
            ["risk", c.risk(refs.riskHash)],
            ["reservation", c.reservation(refs.reservationId)],
            ["approval", c.approval(refs.approvalId)],
            ["simulation", c.simulation(e.hash)],
            [
                "blockhash",
                c
                    .blockhash(r.cluster)
                    .then((h) => h === true ||
                    (typeof h === "number" &&
                        Number.isSafeInteger(h) &&
                        h <= r.lastValidBlockHeight)),
            ],
        ];
        for (const [n, p] of validations)
            if (!(await p))
                throw Error(`authorization_${n}_invalid`);
        if (start !== undefined && start !== (await c.snapshotVersion?.()))
            throw Error("authorization_snapshot_changed");
        const issuedAt = (this.dependencies.now ?? Date.now)(), id = randomUUID();
        if (c.consumeApprovalReservation &&
            !(await c.consumeApprovalReservation(refs.approvalId, refs.reservationId, id)))
            throw Error("authorization_consumption_invalid");
        const claims = {
            ...refs,
            ...(this.signerKeyId ? { signerKeyId: this.signerKeyId } : {}),
            protocol: AUTHORIZATION_PROTOCOL,
            version: 1,
            id,
            cluster: r.cluster,
            feePayer: r.feePayer,
            transaction: r.transaction,
            message: r.message,
            messageHash: r.messageHash,
            recentBlockhash: r.recentBlockhash,
            lastValidBlockHeight: r.lastValidBlockHeight,
            programIds: r.programIds,
            accountKeys: r.accountKeys,
            instructions: r.instructions,
            addressTableLookups: r.addressTableLookups,
            simulationHash: e.hash,
            issuedAt,
            expiresAt: issuedAt + ttl,
        };
        return {
            claims,
            signature: await this.dependencies.signer.sign(canonicalClaims(claims)),
        };
    }
}
/**
 * Host-side gate in front of the signer.
 *
 * The envelope checks themselves are the signer's own {@link SignerWireVerifier}
 * — deliberately the same code, so the host cannot accidentally be laxer than
 * custody. What this class adds is the two things only the host can do: burn
 * the one-time authorization id in the host's replay store, and fence the
 * recent blockhash against the cluster's current height.
 *
 * Blockhash expiry is TERMINAL. The authorization is burned and marked
 * `expired`; nothing re-signs it under a fresh blockhash, because a fresh
 * blockhash is different message bytes, a different message hash, and therefore
 * requires a brand-new operator decision.
 */
export class HostAuthorizationVerifier {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async verify(transaction, envelope) {
        const d = this.dependencies, verified = await new SignerWireVerifier(d).verify(transaction, envelope), claims = envelope.claims;
        if (!(await d.replayStore.consume(claims.id, claims.expiresAt)))
            throw Error("envelope_replayed");
        if (d.blockHeight) {
            const height = await d.blockHeight();
            if (!Number.isSafeInteger(height) || height < 0)
                throw Error("block_height_invalid");
            if (height > claims.lastValidBlockHeight) {
                await d.replayStore.transition?.(claims.id, "claimed", "expired", JSON.stringify({
                    lastValidBlockHeight: claims.lastValidBlockHeight,
                    blockHeight: height,
                }));
                throw Error("envelope_blockhash_expired");
            }
        }
        return {
            transaction: verified.decoded.wireBase64,
            envelope,
            replayStore: d.replayStore,
        };
    }
}
