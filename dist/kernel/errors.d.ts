/** Every reason the kernel can refuse or abort a value-moving action. */
export type GuardCode = "EXECUTION_DISABLED" | "KILL_SWITCH" | "INVALID_INTENT" | "MINT_NOT_PINNED" | "MINT_DENIED" | "TOKEN2022_UNSUPPORTED" | "CAP_EXCEEDED" | "INSUFFICIENT_BALANCE" | "SLIPPAGE_EXCEEDED" | "PRIORITY_FEE_EXCEEDED" | "PRIORITY_FEE_INVALID" | "SIMULATION_FAILED" | "MIN_OUT_MISMATCH" | "DUPLICATE_INTENT" | "BROADCAST_FAILED" | "CONFIRM_TIMEOUT" | "SETTLE_SHORTFALL" | "SETTLE_UNVERIFIABLE" | "SETTLE_UNVERIFIED";
export declare class GuardError extends Error {
    readonly code: GuardCode;
    readonly details: Record<string, unknown> | undefined;
    constructor(code: GuardCode, message: string, details?: Record<string, unknown>);
}
export declare function isGuardError(error: unknown): error is GuardError;
