export type StrategyKind = "dca" | "twap" | "trailing_stop" | "take_profit";
export type StrategyStatus = "active" | "paused" | "done" | "errored";
export declare const STRATEGY_KINDS: readonly StrategyKind[];
export declare function isStrategyKind(value: string): value is StrategyKind;
export interface StrategyRow {
    readonly id: string;
    readonly userId: number;
    readonly kind: StrategyKind;
    status: StrategyStatus;
    params: Record<string, unknown>;
    nextRunAt: number;
    createdAt: number;
    lastRunAt: number | null;
    runs: number;
    errors: number;
    lastError: string | null;
}
/**
 * SQLite-backed strategy store — strategies survive restarts, and the runner is
 * the single writer.
 *
 * Nothing in here is a safety control. A strategy row is a *schedule*: it says
 * when to propose a trade and how big a slice to propose. What actually leaves
 * the wallet is decided downstream by the kernel's guards and the input-leg
 * spend caps, which is why a corrupted or hostile row cannot spend more than an
 * operator already authorised.
 */
export declare class StrategyStore {
    #private;
    constructor(dbPath?: string);
    create(userId: number, kind: StrategyKind, params: Record<string, unknown>, firstRunAt: number): StrategyRow;
    get(id: string): StrategyRow | undefined;
    /** Active strategies whose next run is due. Oldest deadline first. */
    due(now: number): StrategyRow[];
    list(userId: number): StrategyRow[];
    /** Every strategy, newest-first. The console shows all of them, not one user's. */
    all(limit?: number): StrategyRow[];
    save(row: StrategyRow): void;
    /**
     * Set a strategy's status. Returns false when no such row exists, so a
     * console route can answer 404 rather than silently pretending it worked.
     * `node:sqlite` reports `changes` as a bigint — hence the `Number()`.
     */
    setStatus(id: string, status: StrategyStatus): boolean;
    close(): void;
}
