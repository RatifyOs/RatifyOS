import { type AuthorizationEnvelope, type EnvelopeVerifier, type ReplayStore } from "./authorization.js";
import type { SignerAccount } from "./keystore.js";
import { type SignPolicy } from "./policy.js";
import { SqliteReplayStore } from "./replay.js";
export * from "./authorization.js";
export * from "./keystore.js";
export * from "./policy.js";
export * from "./replay.js";
export * from "./transaction.js";
export interface SignResult {
    /** base64 signed wire transaction */
    transaction: string;
    /** base58 fee-payer signature */
    signature: string;
}
/**
 * The custody boundary.
 *
 * Everything this class checks, it checks against bytes it decoded itself.
 * The host supplies a transaction and an authorization envelope; the signer
 * decodes the transaction, proves the envelope describes exactly that
 * transaction, re-applies its own policy, fences the one-time authorization
 * id, fences the recent blockhash, and only then produces a signature.
 */
export declare class SignerService {
    private account;
    private replay;
    private policy;
    private wire?;
    constructor(account: SignerAccount, replay: ReplayStore, policy: SignPolicy, wire?: {
        verifier: EnvelopeVerifier;
        audience: string;
        cluster?: string;
        signerKeyId?: string;
        authorizationKeyIds?: readonly string[];
        policyHash?: string;
        policyVersion?: number;
        now?: () => number;
        /** current cluster block height, used to fence blockhash expiry */
        blockHeight?: () => Promise<number>;
    } | undefined);
    private stored;
    /**
     * Blockhash expiry is the Solana replay fence and it is TERMINAL.
     *
     * If the transaction's blockhash can no longer land, the authorization is
     * burned rather than re-signed. Producing a signature over a fresh
     * blockhash for an already-authorized intent is how double-spends happen,
     * so the only recovery is a brand-new authorization from the control plane.
     */
    private fenceBlockhash;
    /**
     * Low-level path: sign a transaction against policy alone, with no
     * authorization envelope. Used by operator tooling and tests; the daemon
     * itself always goes through `signEnvelope`.
     */
    sign(authorizationId: string, transaction: string, claimedFeePayer: string, lastValidBlockHeight?: number): Promise<SignResult>;
    private signClaimed;
    /**
     * Durable result lookup. A signature that already exists always stays
     * retrievable — withholding it would strand an execution whose transaction
     * may already have landed. `recoverRaw` releases the signed bytes to
     * exactly one caller.
     */
    result(id: string, requestHash: string, recoverRaw?: boolean): {
        state: "signed";
        signature: string;
        transaction?: string;
    } | {
        state: "expired";
    } | {
        state: "not_found";
    };
    /**
     * The daemon path. Order is deliberate: decode, prove the envelope matches
     * the decode, re-check policy — and only then burn the one-time
     * authorization. A request rejected by policy never consumes its
     * authorization id.
     */
    signEnvelope(transaction: string, envelope: AuthorizationEnvelope): Promise<SignResult>;
}
/** Newline-delimited JSON framing for the local socket protocol. */
export declare class JsonFrameDecoder {
    private max;
    private pending;
    constructor(max?: number);
    push(chunk: Buffer): unknown[];
}
export type RpcCall = (method: string, params: unknown[]) => Promise<any>;
/**
 * Broadcast an already-signed, already-persisted transaction.
 *
 * The signed bytes reach durable storage before they reach the network, and
 * the returned signature must equal the one this process computed — an RPC
 * that answers with a different signature is treated as an unresolved
 * broadcast, never as a success.
 */
export declare function broadcastSigned(store: SqliteReplayStore, id: string, transaction: string, rpc: RpcCall): Promise<string>;
/**
 * Settle durable broadcast records without ever signing or resubmitting.
 *
 * A status with an error is `reverted`; a confirmed/finalized status is
 * `confirmed`. A signature the cluster has never seen once its blockhash is
 * past `lastValidBlockHeight` is `dropped` — terminal, because that
 * transaction can no longer land and must not be re-signed.
 */
export declare function reconcileTransactions(store: SqliteReplayStore, rpc: RpcCall): Promise<void>;
