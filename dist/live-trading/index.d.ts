import type { SimulationEvidence, SimulationRequest } from "../execution/simulation.js";
import type { ApprovalEngine, DecisionInput } from "../execution/approvals/index.js";
import type { AuthorizationIssuer } from "../execution/authorization/index.js";
import type { AuthorizationEnvelope, IsolatedSigner, SignerResultResponse, SignerSignResponse, SignerStatusResponse } from "../execution/authorization/wire.js";
export type TradeSide = "buy" | "sell";
export type QuoteSide = TradeSide | "revoke";
/**
 * Durable execution lifecycle.
 *
 * `expired` and `dropped` are the two Solana terminal states and neither is
 * retryable. `expired`: the recent blockhash died before a signature existed.
 * `dropped`: a signature existed and was broadcast, but the cluster never saw
 * it and its blockhash is now past `lastValidBlockHeight`. In both cases the
 * only way forward is a fresh quote, a fresh simulation and a fresh operator
 * decision — never a re-sign, because a new blockhash is new message bytes and
 * a signature over the old ones may still land.
 */
export type TradeState = "awaiting-approval" | "approved" | "dry-run" | "signing" | "submitting" | "reconciliation-required" | "broadcast" | "confirmed" | "finalized" | "failed" | "denied" | "expired" | "dropped";
export type Commitment = "processed" | "confirmed" | "finalized";
export interface TradingPolicy {
    version: number;
    hash?: string;
    /** cap on the input leg, in base units of the mint leaving the wallet */
    maxAmountIn: bigint;
    maxSlippageBps: number;
    approvalRequired: boolean;
    /**
     * Commitment at which an execution is considered final. Solana has no
     * confirmation depth to count; `confirmed` is supermajority vote and
     * `finalized` is rooted.
     */
    finalityCommitment: Commitment;
    /** base58 mints this account may trade */
    allowedMints?: readonly string[];
}
export interface QuoteResult {
    amountOut: bigint;
    /** context slot the quote was produced at */
    slot: bigint;
    /** block height past which the built transaction's blockhash cannot land */
    lastValidBlockHeight: number;
    expiresAt: number;
    request?: SimulationRequest;
    evidence?: SimulationEvidence;
    route?: unknown;
}
export interface SignatureStatus {
    slot: bigint;
    confirmationStatus: Commitment;
    err: unknown;
}
export interface TradingRpc {
    balance(owner: string, mint?: string): Promise<bigint>;
    quote(x: {
        side: TradeSide;
        inputMint: string;
        outputMint: string;
        amountIn: bigint;
    }): Promise<QuoteResult>;
    /**
     * Build and simulate the exact SPL Token `Revoke` that clears the delegate on
     * a token account. This is the Solana analogue of revoking an ERC-20
     * allowance: it is the one instruction that can only ever reduce what someone
     * else may move.
     */
    revokeQuote?(x: {
        tokenAccount: string;
        owner: string;
    }): Promise<QuoteResult>;
    simulate(x: SimulationRequest | Record<string, unknown>): Promise<SimulationEvidence | {
        success: boolean;
        slot: bigint;
        simulationHash: string;
    }>;
    /** Submit base64 signed wire bytes; returns the base58 signature. */
    broadcast(wire: string): Promise<string>;
    status(signature: string): Promise<SignatureStatus | null>;
    /** Current cluster block height — the blockhash-expiry fence. */
    blockHeight(): Promise<number>;
}
export type { IsolatedSigner };
export type SignerStatus = SignerStatusResponse;
type Quote = {
    id: string;
    side: QuoteSide;
    cluster: string;
    inputMint: string;
    outputMint: string;
    amountIn: bigint;
    amountOut: bigint;
    minimumOut: bigint;
    slippageBps: number;
    slot: bigint;
    lastValidBlockHeight: number;
    expiresAt: number;
    intentHash: string;
    quoteHash: string;
    policyHash: string;
    route?: unknown;
    request?: SimulationRequest;
    evidence?: SimulationEvidence;
    /** base64 unsigned wire transaction */
    transaction?: string;
    messageHash?: string;
};
export type Execution = {
    id: string;
    version: number;
    quoteId: string;
    quoteHash?: string;
    intentHash: string;
    policyHash?: string;
    riskHash?: string;
    reservationId?: string;
    simulationHash?: string;
    approvalId?: string;
    authorizationId?: string;
    actor: string;
    dryRun: boolean;
    idempotencyKey: string;
    state: TradeState;
    approver?: string;
    /** `0x` sha256 of the message bytes that were signed */
    messageHash?: string;
    /** base58 transaction signature */
    signature?: string;
    slot?: bigint;
    lastValidBlockHeight?: number;
    createdAt: number;
    updatedAt: number;
};
export declare class ExecutionStore {
    private db;
    constructor(path: string);
    putQuote(q: Quote): Quote;
    getQuote(id: string): Quote | undefined;
    findQuoteByHash(hash: string): Quote | undefined;
    create(x: Omit<Execution, "id" | "version" | "state" | "createdAt" | "updatedAt">, state?: TradeState): Execution;
    get(id: string): Execution | undefined;
    byIdempotency(k: string): Execution | undefined;
    list(states: readonly TradeState[]): Execution[];
    transition(id: string, from: TradeState | TradeState[], p: Partial<Execution>, version?: number): {
        version: number;
        updatedAt: number;
        id: string;
        quoteId: string;
        quoteHash?: string;
        intentHash: string;
        policyHash?: string;
        riskHash?: string;
        reservationId?: string;
        simulationHash?: string;
        approvalId?: string;
        authorizationId?: string;
        actor: string;
        dryRun: boolean;
        idempotencyKey: string;
        state: TradeState;
        approver?: string;
        messageHash?: string;
        signature?: string;
        slot?: bigint;
        lastValidBlockHeight?: number;
        createdAt: number;
    };
    update(id: string, p: Partial<Execution>): {
        version: number;
        updatedAt: number;
        id: string;
        quoteId: string;
        quoteHash?: string;
        intentHash: string;
        policyHash?: string;
        riskHash?: string;
        reservationId?: string;
        simulationHash?: string;
        approvalId?: string;
        authorizationId?: string;
        actor: string;
        dryRun: boolean;
        idempotencyKey: string;
        state: TradeState;
        approver?: string;
        messageHash?: string;
        signature?: string;
        slot?: bigint;
        lastValidBlockHeight?: number;
        createdAt: number;
    };
    close(): void;
}
export declare class TradingOrchestrator {
    private c;
    constructor(c: {
        cluster: string;
        /** base58 fee payer the isolated signer holds */
        account: string;
        policy: TradingPolicy;
        rpc: TradingRpc;
        store: ExecutionStore;
        signer?: IsolatedSigner;
        liveEnabled?: boolean;
        clock?: () => number;
        approvalEngine?: Pick<ApprovalEngine, "request" | "get" | "decide" | "consume">;
        authorizationIssuer?: Pick<AuthorizationIssuer, "issue">;
        risk?: {
            assess: (x: unknown) => Promise<{
                hash: string;
                allowed: boolean;
            }>;
        };
        reservations?: {
            reserve: (x: unknown) => Promise<string>;
            valid: (id: string) => Promise<boolean>;
            commit: (id: string) => Promise<boolean>;
            release: (id: string) => Promise<boolean>;
        };
        audience?: string;
    });
    private get policyHash();
    private now;
    private mint;
    quote(raw: {
        side: TradeSide;
        inputMint: string;
        outputMint: string;
        amountIn: bigint;
        slippageBps: number;
    }): Promise<Quote>;
    /**
     * Pin the exact SPL Token `Revoke` that clears a delegate on a token account.
     *
     * The result flows through the same lifecycle as a swap quote: execute ->
     * approve -> submit -> reconcile, with exact-transaction approval, one-time
     * authorization, and the isolated signer's own policy re-check. The token
     * account is deliberately not restricted to the trading allowlist — revoking
     * a delegate only ever reduces exposure, and operators most need it for
     * tokens they no longer trust. The signer policy's program allowlist remains
     * the final authority on what may be invoked.
     */
    revokeQuote(tokenAccountRaw: string): Promise<Quote>;
    revoke(tokenAccount: string, o: {
        idempotencyKey: string;
        actor: string;
        dryRun?: boolean;
    }): Promise<Execution>;
    execute(quoteId: string, o: {
        idempotencyKey: string;
        actor: string;
        dryRun?: boolean;
    }): Promise<Execution>;
    /**
     * Project a Solana execution into the approval engine's request shape.
     *
     * `src/execution/approvals` still speaks EVM (`nonce`, `value`, `calldata`,
     * `router`), and it is outside this rewrite. Rather than leave those slots
     * empty, each carries its honest Solana counterpart, listed below so the
     * mapping is auditable rather than implied. Renaming them in the approvals
     * module is tracked separately; nothing here depends on the names.
     *
     *   chain    -> cluster
     *   account  -> fee payer
     *   router   -> the program ids the transaction invokes
     *   calldata -> base64 message bytes, i.e. exactly what will be signed
     *   nonce    -> recent blockhash, Solana's replay fence
     *   value    -> the input leg, in base units of the mint leaving the wallet
     */
    private binding;
    assertExact(id: string, r: SimulationRequest): boolean;
    approve(id: string, operator: string, input?: Omit<DecisionInput, "operatorId">): Execution;
    deny(id: string, operator: string, input?: Omit<DecisionInput, "operatorId" | "decision">): Execution;
    refreshApproval(id: string, operator?: string): Execution;
    /**
     * Burn the execution because its blockhash can no longer land.
     *
     * Terminal by construction: the reservation is released and no signature is
     * ever produced for these bytes. Recovery means a new quote, not a retry.
     */
    private expire;
    submit(id: string): Promise<{
        version: number;
        updatedAt: number;
        id: string;
        quoteId: string;
        quoteHash?: string;
        intentHash: string;
        policyHash?: string;
        riskHash?: string;
        reservationId?: string;
        simulationHash?: string;
        approvalId?: string;
        authorizationId?: string;
        actor: string;
        dryRun: boolean;
        idempotencyKey: string;
        state: TradeState;
        approver?: string;
        messageHash?: string;
        signature?: string;
        slot?: bigint;
        lastValidBlockHeight?: number;
        createdAt: number;
    }>;
    recover(id: string): Execution;
    /**
     * Recover an execution stranded in `signing`.
     *
     * A dropped signing response is the case that must never produce a second
     * signature: the daemon may already have signed, and re-issuing an
     * authorization would authorize the same intent twice. So the signature is
     * *retrieved* from the signer's durable store, verified against the bytes it
     * came with, and broadcast once.
     */
    recoverSigning(row: Execution): Promise<{
        version: number;
        updatedAt: number;
        id: string;
        quoteId: string;
        quoteHash?: string;
        intentHash: string;
        policyHash?: string;
        riskHash?: string;
        reservationId?: string;
        simulationHash?: string;
        approvalId?: string;
        authorizationId?: string;
        actor: string;
        dryRun: boolean;
        idempotencyKey: string;
        state: TradeState;
        approver?: string;
        messageHash?: string;
        signature?: string;
        slot?: bigint;
        lastValidBlockHeight?: number;
        createdAt: number;
    }>;
    recoverAndReconcile(limit?: number): Promise<{
        scanned: number;
        recovered: number;
        reconciled: number;
        failed: number;
    }>;
    /**
     * Settle a broadcast execution without ever re-signing or resubmitting.
     *
     * A signature the cluster has never seen is not yet a failure — until its
     * blockhash passes `lastValidBlockHeight`, at which point it can never land
     * and the execution is `dropped`, terminally.
     */
    reconcile(id: string): Promise<Execution>;
    status(id: string): Execution | {
        challenge: string;
        approvalRevision: number;
        id: string;
        version: number;
        quoteId: string;
        quoteHash?: string;
        intentHash: string;
        policyHash?: string;
        riskHash?: string;
        reservationId?: string;
        simulationHash?: string;
        approvalId?: string;
        authorizationId?: string;
        actor: string;
        dryRun: boolean;
        idempotencyKey: string;
        state: TradeState;
        approver?: string;
        /** `0x` sha256 of the message bytes that were signed */
        messageHash?: string;
        /** base58 transaction signature */
        signature?: string;
        slot?: bigint;
        lastValidBlockHeight?: number;
        createdAt: number;
        updatedAt: number;
    };
    private require;
}
/**
 * The host end of the signer daemon's local socket.
 *
 * Every method returns one of the shared wire types in
 * `src/execution/authorization/wire.ts`, which are derived from
 * `SignerService`'s own signatures. That is the whole point: this class used to
 * speak a protocol the daemon had stopped speaking, and it typechecked
 * perfectly while doing so.
 */
export declare class UnixSignerClient implements IsolatedSigner {
    private socketPath;
    private authorizationToken;
    private timeoutMs;
    constructor(socketPath: string, authorizationToken?: string, timeoutMs?: number);
    private request;
    status(): Promise<SignerStatus>;
    probe(): Promise<boolean>;
    sign(request: {
        transaction: string;
        envelope: AuthorizationEnvelope;
        broadcast?: boolean;
    }): Promise<SignerSignResponse>;
    result(request: {
        authorizationId: string;
        messageHash: string;
        recoverRaw?: boolean;
    }): Promise<SignerResultResponse>;
}
