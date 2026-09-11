export interface PolicyDocument {
    version: string;
    effectiveAt: bigint;
    expiresAt: bigint;
    allow: {
        chains: bigint[];
        accounts: string[];
        tokens: string[];
        routers: string[];
        targets: string[];
        selectors: string[];
        recipients: string[];
    };
    limits: {
        perTrade: bigint;
        assetHourly: bigint;
        assetDaily: bigint;
        strategyHourly: bigint;
        strategyDaily: bigint;
        totalExposure: bigint;
        assetExposure: bigint;
        concentrationBps: bigint;
        drawdown: bigint;
        totalLoss: bigint;
    };
    market: {
        maxQuoteAge: bigint;
        maxSlippageBps: bigint;
        maxImpactBps: bigint;
        maxGas: bigint;
        maxFees: bigint;
        minLiquidity: bigint;
        maxTaxBps: bigint;
        allowProxy: boolean;
        maxOracleAge: bigint;
        requireSequencerUp: boolean;
    };
    approvalClass: "exact";
    deadManAfter: bigint;
    globalKill: boolean;
    strategyKills: string[];
}
export interface SignedPolicyReference {
    policyHash: string;
    signature: string;
    keyId?: string;
}
export type PolicyVerifier = (reference: SignedPolicyReference, expectedHash: string) => boolean;
export interface TradeRequest {
    id: string;
    now: bigint;
    chain: bigint;
    account: string;
    tokenIn: string;
    tokenOut: string;
    router: string;
    target: string;
    selector: string;
    recipient: string;
    strategy: string;
    amount: bigint;
    approvalAmount: bigint;
    quoteAt: bigint;
    slippageBps: bigint;
    impactBps: bigint;
    gas: bigint;
    fees: bigint;
    liquidity: bigint;
    taxBps: bigint;
    isProxy: boolean;
    oracleAt: bigint;
    sequencerUp: boolean;
    portfolioExposure: bigint;
    assetExposure: bigint;
    portfolioValue: bigint;
    peakValue: bigint;
    realizedLoss: bigint;
    unrealizedLoss: bigint;
    lastHeartbeat: bigint;
}
export interface LedgerEntry {
    id: string;
    at: bigint;
    asset: string;
    strategy: string;
    amount: bigint;
}
export interface ProductionRiskLimits {
    chains: bigint[];
    accounts: string[];
    routers: string[];
    tokens: string[];
    maxPerTrade: Record<string, bigint>;
    maxReservedPerToken: Record<string, bigint>;
    maxReservedAggregate?: bigint;
    maxSlippageBps: bigint;
    maxQuoteAge: bigint;
    maxQuoteBlocks: bigint;
    nativeGasReserve: bigint;
    maxDailyNotional?: bigint;
}
export interface ProductionRiskInput {
    now: bigint;
    chain: bigint;
    account: string;
    router: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    slippageBps: bigint;
    quoteAt: bigint;
    quoteBlock: bigint;
    currentBlock: bigint;
    quoteBlockHash: string;
    canonicalBlockHash: string;
    tokenBalance: bigint;
    nativeBalance: bigint;
    estimatedGasCost: bigint;
    notional?: bigint;
    dailyNotional?: bigint;
}
export declare class ProductionRiskEvaluator {
    readonly limits: ProductionRiskLimits;
    constructor(limits: ProductionRiskLimits);
    evaluate(x: ProductionRiskInput, entries: readonly LedgerEntry[]): {
        allowed: boolean;
        reasons: string[];
    };
}
type Internal = LedgerEntry & {
    state: "reserved" | "committed";
};
export declare const canonicalPolicy: (p: PolicyDocument) => string;
export declare const policyHash: (p: PolicyDocument) => string;
export declare class ReservationLedger {
    private db;
    private now;
    private ttl;
    private closed;
    private aggregateQuote;
    constructor(path?: string, o?: {
        now?: () => bigint;
        reservationTtl?: bigint;
        aggregateQuote?: {
            denomination: string;
            decimals: number;
        };
    });
    transaction<T>(f: () => T): T;
    private expire;
    has(id: string): boolean;
    reserve(e: LedgerEntry): boolean;
    reserveWithin(e: LedgerEntry, l: {
        perAsset: bigint;
        aggregate?: bigint | {
            denomination: string;
            decimals: number;
            max: bigint;
            value: bigint;
            evidence: string;
        };
    }): boolean;
    release(id: string): boolean;
    commit(id: string, _at?: bigint): boolean;
    entries(now: bigint): Internal[];
    usage(now: bigint, w: bigint, p: (e: LedgerEntry) => boolean): bigint;
    reconcile(es: LedgerEntry[], now?: bigint): "discrepancy" | "ok";
    status(): "ok" | "discrepancy";
    close(): void;
}
export interface Decision {
    allowed: boolean;
    reasons: string[];
    reservationId?: string;
}
export declare class TradingControl {
    private p;
    private ref;
    private verify;
    private ledger;
    constructor(p: PolicyDocument, ref: SignedPolicyReference, verify: PolicyVerifier, ledger?: ReservationLedger);
    reserve(t: TradeRequest): Decision;
    private evaluate;
    release(id: string): boolean;
    commit(id: string, at: bigint): boolean;
    reconcile(e: LedgerEntry[]): "discrepancy" | "ok";
}
export {};
