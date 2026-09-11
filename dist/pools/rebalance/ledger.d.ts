/**
 * Rebalance history — the state the churn limiters read.
 *
 * Kept deliberately tiny and *injected* rather than global: the decision function
 * takes a plain `RebalanceHistory` value, so it stays pure and the persistence
 * choice (in-memory here, SQLite in the engine) is somebody else's problem.
 *
 * The daily cap is a **rolling 24h window**, not a calendar day. A calendar reset
 * lets an agent burn its whole allowance at 23:59 and the next one at 00:01 —
 * exactly the churn the cap exists to prevent.
 */
export interface RebalanceHistory {
    /** Epoch ms of the most recent rebalance for this position, or null if never. */
    readonly lastAt: number | null;
    /** Rebalances for this position inside the trailing 24h. */
    readonly countInWindow: number;
}
export declare const EMPTY_HISTORY: RebalanceHistory;
/** In-memory rolling-window ledger. One instance per engine; keyed by position address. */
export declare class RebalanceLedger {
    #private;
    constructor(windowMs?: number);
    /** Record a rebalance that actually executed. Never record a rejected decision. */
    record(positionAddress: string, at: number): void;
    history(positionAddress: string, now: number): RebalanceHistory;
    /** Positions with any activity still inside the window. */
    tracked(): readonly string[];
}
