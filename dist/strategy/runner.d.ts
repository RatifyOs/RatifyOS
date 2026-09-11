import type { StrategyStore } from "./store.js";
/**
 * A swap a strategy wants performed, in UI units of the INPUT asset.
 *
 * Deliberately NOT a `TradeIntent`. A strategy schedules *intentions to trade*;
 * turning one into an executable, kernel-validated intent requires a live quote
 * and belongs to the executor. Keeping the two apart is what makes the runner
 * testable without a chain and — more importantly — what makes it impossible
 * for the runner to construct a transaction of its own.
 */
export interface StrategySwap {
    readonly kind: "buy" | "sell" | "swap";
    /** UI units of the INPUT asset (e.g. 0.5 SOL). */
    readonly amountUi: number;
    readonly inputMint: string;
    readonly outputMint: string;
    readonly slippageBps: number | undefined;
}
export interface StrategySwapResult {
    readonly ok: boolean;
    readonly text: string;
    readonly signature?: string | undefined;
}
/**
 * The runner's ONLY route to value movement.
 *
 * `swap()` is expected to hand a `TradeIntent` to `TradeGateway.execute()` and
 * do nothing else — see `gatewayExecutor` in `./executor.ts`, which is the
 * implementation the composition root mounts. The runner cannot sign, cannot
 * build a transaction, and cannot reach an RPC: everything it can do to a
 * wallet has to pass through this one method, and therefore through the
 * kernel's guards, its input-leg spend caps and its journal.
 *
 * The daily cap is the backstop that makes the interval loop safe to leave
 * running: however wrong a schedule is, the total autonomous spend in any
 * rolling day is bounded by policy the model never sees.
 */
export interface StrategyExecutor {
    swap(req: StrategySwap, idempotencyKey: string): Promise<StrategySwapResult>;
    /**
     * Current price of a mint, in whatever unit the strategies were created with.
     * Optional: without it, price-triggered strategies (trailing stop, take
     * profit) SKIP rather than guess.
     */
    price?(mint: string): Promise<number | undefined>;
    /** Notify the owner. Optional; failures never break the runner. */
    notify?(userId: number, text: string): Promise<void>;
}
/**
 * The autonomous strategy runner. Ticks on an interval, executes due strategies
 * one at a time (single-writer), and auto-pauses a strategy after
 * {@link MAX_CONSECUTIVE_ERRORS} consecutive failures so a broken schedule stops
 * burning fees instead of retrying forever.
 *
 * Two breakers, deliberately at different altitudes:
 *
 *  · **the error breaker here** is local and per-strategy — it stops *this*
 *    schedule when it keeps failing;
 *  · **the kernel's rolling daily cap** is global and denominated in the input
 *    leg — it stops *everything* once the day's authorised spend is used up.
 *
 * The second is the one that has to be right, and it is not implemented here:
 * it is enforced inside `TradeGateway.execute()`, which every swap above passes
 * through.
 */
export declare class StrategyRunner {
    #private;
    constructor(store: StrategyStore, exec: StrategyExecutor, tickMs?: number);
    get running(): boolean;
    start(): void;
    stop(): void;
    /** One pass over the due set. Re-entrant calls are dropped, not queued. */
    tick(): Promise<void>;
}
