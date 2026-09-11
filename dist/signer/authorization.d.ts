import { type DecodedTransaction } from "./transaction.js";
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
export declare const AUTHORIZATION_PROTOCOL = "ari-solana-execution-authorization";
export interface AuthorizationReferences {
    quoteHash: string;
    policyHash: string;
    policyVersion: number;
    riskHash: string;
    reservationId: string;
    approvalId: string;
    audience: string;
    signerKeyId?: string;
}
export interface AuthorizationInstructionClaim {
    programId: string;
    /** base58 account keys; `null` where an address lookup table is involved */
    accounts: readonly (string | null)[];
    /** lowercase hex instruction data */
    data: string;
}
export interface AuthorizationClaims extends AuthorizationReferences {
    protocol: string;
    version: number;
    id: string;
    cluster: string;
    feePayer: string;
    /** base64 unsigned wire transaction */
    transaction: string;
    /** base64 message bytes — exactly what the Ed25519 signature commits to */
    message: string;
    /** `0x` sha256 of the message bytes */
    messageHash: string;
    recentBlockhash: string;
    /**
     * The block height past which `recentBlockhash` can no longer land. Solana
     * has no account nonce; this is the replay fence, and crossing it is
     * terminal — the signer never re-signs under a fresh blockhash.
     */
    lastValidBlockHeight: number;
    /** sorted unique program ids the transaction invokes */
    programIds: readonly string[];
    /** static account keys, in message order */
    accountKeys: readonly string[];
    instructions: readonly AuthorizationInstructionClaim[];
    /** address lookup table accounts referenced by the message */
    addressTableLookups: readonly string[];
    simulationHash: string;
    issuedAt: number;
    expiresAt: number;
}
export interface AuthorizationEnvelope {
    claims: AuthorizationClaims;
    signature: string;
}
export interface EnvelopeVerifier {
    verify: (canonicalClaims: string, signature: string, keyId?: string) => Promise<boolean>;
}
export declare const canonicalClaims: (c: AuthorizationClaims) => string;
/**
 * Execution lifecycle inside the signer.
 *
 * `expired` is TERMINAL and reachable only from `claimed`: the signer refused
 * to sign because the transaction's blockhash was already past its last valid
 * height, and the authorization is burned rather than re-signed. It is never
 * reachable from `signed` — a signature that already exists stays retrievable
 * so the reconciler can find out whether it landed.
 *
 * `dropped` is the post-broadcast twin: signed and sent, but the cluster never
 * saw it and its blockhash is now dead. Also terminal, also never re-signed.
 */
export type ExecutionState = "issued" | "claimed" | "signing" | "signed" | "broadcast" | "reconciliation" | "confirmed" | "reverted" | "expired" | "dropped" | "failed";
export interface ReplayStore {
    consume(id: string, expiresAt: number): Promise<boolean>;
    transition?(id: string, from: ExecutionState, to: ExecutionState, data?: string): Promise<boolean>;
    get?(id: string): {
        state: ExecutionState;
        data?: string | null;
    } | undefined;
}
export declare class InMemoryReplayStore implements ReplayStore {
    readonly states: Map<string, ExecutionState>;
    readonly data: Map<string, string>;
    consume(id: string): Promise<boolean>;
    transition(id: string, from: ExecutionState, to: ExecutionState, data?: string): Promise<boolean>;
    get(id: string): {
        state: ExecutionState;
        data?: never;
    } | {
        state: ExecutionState;
        data: string;
    } | undefined;
}
export interface VerifiedAuthorization {
    decoded: DecodedTransaction;
    envelope: AuthorizationEnvelope;
}
/**
 * Verifies an authorization envelope against an independently decoded
 * transaction. Never consumes the replay fence — the caller does that once
 * policy has also passed, so a rejected request cannot burn an authorization.
 */
export declare class SignerWireVerifier {
    private readonly dependencies;
    constructor(dependencies: {
        verifier: EnvelopeVerifier;
        now?: () => number;
        audience: string;
        cluster?: string;
        signerKeyId?: string;
        authorizationKeyIds?: readonly string[];
        policyHash?: string;
        policyVersion?: number;
        maxTtlMs?: number;
    });
    verify(transaction: string | DecodedTransaction, envelope: AuthorizationEnvelope): Promise<VerifiedAuthorization>;
}
