/**
 * Refusal codes for the pools layer.
 *
 * These sit *in front of* the kernel, never instead of it. `TradeGateway.execute()`
 * still re-validates every intent this package produces from scratch; a pool guard
 * that passes buys you nothing at the metal. What these add is the handful of
 * checks the kernel cannot express today — LP position sizing, bonding-curve
 * liquidity floors, rug-heat, and rebalance economics — all of them **pure,
 * synchronous, and fail-closed**: a missing input is a rejection, never a pass.
 */
export type PoolGuardCode = "POOL_SPEND_CAP" | "POOL_POSITION_CAP" | "POOL_MAX_POSITIONS" | "POOL_BASE_LEG_CAP" | "POOL_MINT_AUTHORITY" | "POOL_FREEZE_AUTHORITY" | "POOL_TOKEN2022" | "POOL_RUG_HEAT" | "POOL_LIQUIDITY_FLOOR" | "POOL_SLIPPAGE" | "POOL_RANGE_INVALID" | "POOL_MIGRATED" | "POOL_NOT_MIGRATED" | "POOL_UNSUPPORTED_CURVE" | "POOL_EXTRA_SIGNER" | "POOL_MULTI_TX" | "REBALANCE_TOO_SOON" | "REBALANCE_DAILY_CAP" | "REBALANCE_NOT_DRIFTED" | "REBALANCE_UNECONOMIC" | "POOL_SDK_MISSING" | "POOL_VENUE_ERROR";
export declare class PoolGuardError extends Error {
    readonly code: PoolGuardCode;
    readonly details: Record<string, unknown> | undefined;
    constructor(code: PoolGuardCode, message: string, details?: Record<string, unknown>);
}
export declare function isPoolGuardError(error: unknown): error is PoolGuardError;
/** A refusal reason carried as data (the pure guards return these; they do not throw). */
export interface Refusal {
    readonly code: PoolGuardCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
}
export declare function refuse(code: PoolGuardCode, message: string, details?: Record<string, unknown>): Refusal;
/** Turn a data-shaped refusal into the throwable form (used at the tool boundary). */
export declare function throwRefusal(r: Refusal): never;
