import { decodeTransaction } from "./transaction.js";
/**
 * Signer-side authorization envelopes, Solana edition.
 *
 * These types are declared here rather than imported from
 * `src/execution/authorization` on purpose: the execution-side issuer is
 * being rewritten in parallel and the custody boundary must not depend on
 * work in flight. The wire shape below is what the signer will accept; the
 * issuer has to match it.
 *
 * The envelope is a *claim* about what is being signed. It is never trusted
 * on its own — `SignerWireVerifier` decodes the transaction independently and
 * refuses to continue unless the decode and the claims agree exactly.
 */
export const AUTHORIZATION_PROTOCOL = "ari-solana-execution-authorization";
const normalize = (v) => typeof v === "bigint"
    ? v.toString()
    : Array.isArray(v)
        ? v.map(normalize)
        : v && typeof v === "object"
            ? Object.fromEntries(Object.entries(v)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, x]) => [k, normalize(x)]))
            : v;
export const canonicalClaims = (c) => JSON.stringify(normalize(c));
const eq = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
export class InMemoryReplayStore {
    states = new Map();
    data = new Map();
    async consume(id) {
        if (this.states.has(id))
            return false;
        this.states.set(id, "claimed");
        return true;
    }
    async transition(id, from, to, data) {
        if (this.states.get(id) !== from)
            return false;
        this.states.set(id, to);
        if (data !== undefined)
            this.data.set(id, data);
        return true;
    }
    get(id) {
        const state = this.states.get(id);
        if (!state)
            return undefined;
        const data = this.data.get(id);
        return data === undefined ? { state } : { state, data };
    }
}
/**
 * Verifies an authorization envelope against an independently decoded
 * transaction. Never consumes the replay fence — the caller does that once
 * policy has also passed, so a rejected request cannot burn an authorization.
 */
export class SignerWireVerifier {
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    async verify(transaction, envelope) {
        const d = typeof transaction === "string"
            ? decodeTransaction(transaction)
            : transaction;
        const c = envelope?.claims, now = (this.dependencies.now ?? Date.now)(), maxTtl = this.dependencies.maxTtlMs ?? 60_000;
        if (!c || typeof c !== "object")
            throw Error("envelope_invalid");
        if (c.protocol !== AUTHORIZATION_PROTOCOL || c.version !== 1)
            throw Error("envelope_version_invalid");
        if (!Number.isSafeInteger(c.issuedAt) || !Number.isSafeInteger(c.expiresAt))
            throw Error("envelope_version_invalid");
        if (c.issuedAt > now)
            throw Error("envelope_issued_in_future");
        if (now >= c.expiresAt || c.expiresAt - c.issuedAt > maxTtl)
            throw Error("envelope_expired");
        if (c.audience !== this.dependencies.audience)
            throw Error("envelope_audience_mismatch");
        if (this.dependencies.signerKeyId &&
            c.signerKeyId !== this.dependencies.signerKeyId)
            throw Error("envelope_signer_mismatch");
        if ((this.dependencies.policyHash &&
            c.policyHash?.toLowerCase() !==
                this.dependencies.policyHash.toLowerCase()) ||
            (this.dependencies.policyVersion !== undefined &&
                c.policyVersion !== this.dependencies.policyVersion))
            throw Error("envelope_policy_mismatch");
        if (this.dependencies.authorizationKeyIds &&
            (!c.signerKeyId ||
                !this.dependencies.authorizationKeyIds.includes(c.signerKeyId)))
            throw Error("envelope_authorization_key_unknown");
        if (!(await this.dependencies.verifier.verify(canonicalClaims(c), envelope.signature, c.signerKeyId)))
            throw Error("envelope_signature_invalid");
        if (this.dependencies.cluster !== undefined &&
            c.cluster !== this.dependencies.cluster)
            throw Error("envelope_cluster_mismatch");
        if (!Number.isSafeInteger(c.lastValidBlockHeight) ||
            c.lastValidBlockHeight < 0)
            throw Error("envelope_blockhash_invalid");
        // Everything below compares the operator-signed claims against what this
        // process decoded out of the wire bytes. Any divergence is fatal.
        if (c.transaction !== d.wireBase64 ||
            c.message !== d.messageBase64 ||
            c.messageHash?.toLowerCase() !== d.messageHash.toLowerCase() ||
            c.feePayer !== d.feePayer ||
            c.recentBlockhash !== d.recentBlockhash ||
            !eq(c.accountKeys, d.staticAccountKeys) ||
            !eq(c.programIds, [...new Set(d.instructions.map((i) => i.programId))].sort()) ||
            !eq(c.addressTableLookups, d.addressTableLookups.map((l) => l.accountKey)) ||
            !eq(c.instructions, d.instructions.map((i) => ({
                programId: i.programId,
                accounts: i.accounts,
                data: i.dataHex,
            }))))
            throw Error("envelope_transaction_mismatch");
        return { decoded: d, envelope };
    }
}
