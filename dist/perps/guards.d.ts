import { type PerpGuardCode } from "./errors.js";
import type { PortfolioExposure } from "./exposure.js";
import { type PerpIntent } from "./intent.js";
import { type PerpsPolicy } from "./policy.js";
import type { PerpPosition } from "./types.js";
/**
 * Perps guards — pure, synchronous, total, and fail-closed.
 *
 * Every rule is a `(intent, ctx) => violation | null` function of data the
 * caller already has. No I/O, no clock, no randomness: the entire perps safety
 * layer is decidable from its arguments, which is exactly what makes it
 * exhaustively unit-testable and what keeps it honest about missing data —
 * "I could not read it" is always a refusal, never a default.
 *
 * These run IN ADDITION to the kernel's `staticGuards` + input-leg cap
 * reservation, never instead of them. The margin still passes through the same
 * chokepoint as any swap.
 */
export interface PerpViolation {
    readonly code: PerpGuardCode;
    readonly message: string;
    readonly details: Record<string, unknown> | undefined;
}
export interface PerpGuardContext {
    readonly policy: PerpsPolicy;
    /** Mirrored from the kernel's `PolicyConfig` so the perps layer sees the same arm state. */
    readonly killSwitch: boolean;
    readonly executionEnabled: boolean;
    /** Portfolio snapshot. A stale snapshot refuses every opening intent. */
    readonly exposure: PortfolioExposure;
    /** The existing position in this market, if any. */
    readonly position: PerpPosition | undefined;
    /** Whether the venue subaccount already exists. Creation is its own gated step. */
    readonly accountInitialized: boolean;
    readonly dryRun: boolean;
}
type Rule = (intent: PerpIntent, ctx: PerpGuardContext) => PerpViolation | null;
/**
 * The rule list. Order is the reporting order and the throw order: arm state
 * first (cheapest and most important), then admissibility, then caps, then
 * risk-of-ruin.
 */
export declare const PERP_RULES: readonly Rule[];
/**
 * ENFORCEMENT path: throws `PerpGuardError` on the first violation.
 * `PerpGuardError extends GuardError`, so the kernel's existing error handling,
 * journal, and Telegram rendering all work on it unchanged.
 */
export declare function perpGuards(intent: PerpIntent, ctx: PerpGuardContext): void;
export interface PerpGuardVerdict {
    readonly ok: boolean;
    readonly violations: readonly PerpViolation[];
}
/**
 * ADVISORY path: runs every rule and collects all violations, for quote cards
 * and tool previews. Shares the exact same rule list as `perpGuards`, so an
 * advisory pass can never disagree with enforcement.
 */
export declare function evaluatePerpGuards(intent: PerpIntent, ctx: PerpGuardContext): PerpGuardVerdict;
/**
 * Live-position risk read, for monitoring rather than admission: how close an
 * ALREADY OPEN position sits to liquidation right now. Returns `undefined` when
 * the venue gave no usable liquidation price — again, never a guess.
 */
export declare function positionLiquidationDistanceBps(position: PerpPosition): number | undefined;
export {};
