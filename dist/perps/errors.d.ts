import { type GuardCode, GuardError } from "../kernel/errors.js";
/**
 * Every reason the perps layer can refuse an intent.
 *
 * These are FINER-GRAINED than the kernel's `GuardCode`, not a replacement for
 * it: `PerpGuardError extends GuardError`, so `isGuardError()`, the kernel's
 * journal, and the existing Telegram error rendering all keep working unchanged
 * while the precise perp reason survives on `.perpCode`.
 */
export declare const PERP_GUARD_CODES: readonly ["PERPS_DISABLED", "KILL_SWITCH", "WIND_DOWN_ONLY", "INVALID_PERP_INTENT", "MARKET_DENIED", "MARKET_NOT_TRADEABLE", "COLLATERAL_MINT_DENIED", "COLLATERAL_NOT_CAPPABLE", "LEVERAGE_EXCEEDED", "COLLATERAL_CAP_EXCEEDED", "NOTIONAL_CAP_EXCEEDED", "PORTFOLIO_EXPOSURE_EXCEEDED", "POSITION_COUNT_EXCEEDED", "EXPOSURE_UNKNOWN", "LIQUIDATION_TOO_CLOSE", "LIQUIDATION_UNKNOWN", "FUNDING_RATE_UNSANE", "FUNDING_RATE_ADVERSE", "FUNDING_RATE_UNKNOWN", "ORACLE_DIVERGENCE", "SLIPPAGE_EXCEEDED", "REDUCE_ONLY_VIOLATION", "NO_POSITION", "POSITION_SIDE_MISMATCH", "SIZE_EXCEEDS_POSITION", "ACCOUNT_NOT_INITIALIZED", "ACCOUNT_CREATION_DISABLED"];
export type PerpGuardCode = (typeof PERP_GUARD_CODES)[number];
export declare function kernelCodeFor(code: PerpGuardCode): GuardCode;
export declare class PerpGuardError extends GuardError {
    readonly perpCode: PerpGuardCode;
    constructor(perpCode: PerpGuardCode, message: string, details?: Record<string, unknown>);
}
export declare function isPerpGuardError(error: unknown): error is PerpGuardError;
/** A venue-adapter failure that is NOT a policy refusal (RPC down, SDK missing, market unknown). */
export declare class PerpsVenueError extends Error {
    readonly venue: string;
    constructor(venue: string, message: string);
}
