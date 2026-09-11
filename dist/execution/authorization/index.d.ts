import { type AuthorizationEnvelope, type AuthorizationReferences, type EnvelopeVerifier, type ReplayStore } from "../../signer/authorization.js";
import { type SimulationEvidence, type SimulationRequest } from "../simulation.js";
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
export type { AuthorizationClaims, AuthorizationEnvelope, AuthorizationInstructionClaim, AuthorizationReferences, EnvelopeVerifier, ExecutionState, ReplayStore, } from "../../signer/authorization.js";
export * from "./wire.js";
export interface AuthorizationChecks {
    quote: (hash: string) => Promise<boolean>;
    policy: (hash: string) => Promise<boolean>;
    risk: (hash: string) => Promise<boolean>;
    reservation: (id: string) => Promise<boolean>;
    approval: (id: string) => Promise<boolean>;
    simulation: (hash: string) => Promise<boolean>;
    /**
     * Current cluster block height, or `true` when the caller cannot observe it.
     *
     * This replaces the EVM account-nonce check. Solana has no nonce: a
     * transaction is fenced by the recent blockhash it was built with, and once
     * the cluster passes `lastValidBlockHeight` that transaction can never land.
     * Issuing an authorization for a dead blockhash would produce a signature
     * that is useless at best — and at worst invites a re-sign under a fresh
     * blockhash, which is how the same intent gets executed twice.
     */
    blockhash: (cluster: string) => Promise<number | boolean>;
    consumeApprovalReservation?: (approval: string, reservation: string, authorizationId: string) => Promise<boolean>;
    snapshotVersion?: () => Promise<string>;
}
export interface EnvelopeSigner {
    sign: (canonicalClaims: string) => Promise<string>;
}
export declare class AuthorizationIssuer {
    readonly dependencies: {
        checks: AuthorizationChecks;
        signer: EnvelopeSigner;
        signerKeyId?: string;
        now?: () => number;
        ttlMs?: number;
        maxTtlMs?: number;
    };
    get signerKeyId(): string | undefined;
    constructor(dependencies: {
        checks: AuthorizationChecks;
        signer: EnvelopeSigner;
        signerKeyId?: string;
        now?: () => number;
        ttlMs?: number;
        maxTtlMs?: number;
    });
    issue(r: SimulationRequest, e: SimulationEvidence, refs: AuthorizationReferences): Promise<AuthorizationEnvelope>;
}
export interface VerifiedHostAuthorization {
    /** base64 canonical wire transaction, as decoded here */
    transaction: string;
    envelope: AuthorizationEnvelope;
    replayStore: ReplayStore;
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
export declare class HostAuthorizationVerifier {
    private readonly dependencies;
    constructor(dependencies: {
        verifier: EnvelopeVerifier;
        replayStore: ReplayStore;
        audience: string;
        cluster?: string;
        now?: () => number;
        signerKeyId?: string;
        authorizationKeyIds?: readonly string[];
        policyHash?: string;
        policyVersion?: number;
        maxTtlMs?: number;
        blockHeight?: () => Promise<number>;
    });
    verify(transaction: string, envelope: AuthorizationEnvelope): Promise<VerifiedHostAuthorization>;
}
