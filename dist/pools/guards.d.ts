import { type MintInfo } from "../kernel/contracts.js";
import { type TokenAmount } from "../kernel/money.js";
import type { RugHeat } from "./signals.js";
import { type Refusal } from "./errors.js";
import type { LpPosition, PoolSummary, PriceLevel } from "./types.js";
/**
 * Pure, synchronous, **fail-closed** guards for liquidity and bonding-curve
 * actions.
 *
 * Three rules hold everywhere in this file:
 *
 *  1. **No I/O, no clock, no randomness.** Every input is passed in, so every
 *     branch is unit-testable and nothing here can hang a trade.
 *  2. **Absent evidence is a refusal.** A missing mint record, a missing rug-heat
 *     reading, an unknown TVL — each returns a `Refusal`, never a pass. The
 *     failure mode of "we couldn't check" must be identical to "the check failed".
 *  3. **Caps are denominated in the asset that leaves the wallet.** No price
 *     oracle sits in this path, exactly as in the kernel's input-leg caps: a
 *     memecoin with a broken price feed cannot inflate its way past a limit.
 *
 * These run *before* the kernel and add nothing to it. `TradeGateway.execute()`
 * still re-derives everything it cares about from the intent itself.
 */
/** Per-quote-asset limits, in that asset's base units. */
export interface QuoteLimits {
    /** Max input-leg amount for one value-moving pool/curve action. */
    readonly maxSpendPerAction: bigint;
    /** Max total quote notional allowed to sit inside a single LP position. */
    readonly maxLpPositionQuote: bigint;
    /** A pool below this TVL (quote base units) is refused outright. */
    readonly minPoolLiquidityQuote: bigint;
}
export interface PoolGuardConfig {
    readonly sol: QuoteLimits;
    readonly usdc: QuoteLimits;
    /** Hard ceiling on concurrent open LP positions across all venues. */
    readonly maxConcurrentPositions: number;
    /**
     * For a two-sided deposit the base leg also leaves the wallet, and the kernel
     * only caps the quote leg. This bounds the base leg as a percentage of what the
     * wallet currently holds of that mint — oracle-free, denominated in the asset
     * itself. 100 disables the check; 0 forbids two-sided deposits entirely.
     */
    readonly maxBaseLegPctOfHoldings: number;
    /**
     * Rug-heat at or above this is a **rejection**, not a warning. Sourced from
     * A signals engine's `rugHeatScore()` (0 = clean, 100 = burning); see `signals.ts`.
     */
    readonly maxRugHeat: number;
    /** Slippage bound for bonding-curve buys/sells, in bps. */
    readonly maxCurveSlippageBps: number;
    /** A curve holding less real SOL than this is untradeable-by-policy. */
    readonly minCurveRealSolLamports: bigint;
    /** Mints explicitly permitted to carry a live mint/freeze authority. */
    readonly authorityAllowlist: readonly string[];
    /** Phase parity with the kernel: Token-2022 legs are refused unless enabled. */
    readonly allowToken2022: boolean;
    /** Widest level span a single position may cover. DLMM's own limit is 70 bins. */
    readonly maxLevelSpan: number;
}
/** DLMM stores at most 70 bins in one position account (`DEFAULT_BIN_PER_POSITION`). */
export declare const MAX_LEVELS_PER_POSITION = 70;
/**
 * Deliberately tight defaults. LP is a longer-dated, harder-to-exit exposure than
 * a swap, so these sit *below* the kernel's swap caps rather than beside them.
 */
export declare function defaultPoolGuardConfig(): PoolGuardConfig;
export declare function limitsFor(cfg: PoolGuardConfig, mint: string): QuoteLimits | null;
/**
 * Input-leg spend cap. Mirrors the kernel's denomination rule: only quote-asset
 * inputs (SOL/USDC) are capped in notional terms, because only those can be
 * bounded without a price oracle. A token input (a sell) is not capped here —
 * that is the kernel's `quoteBucketFor(...) === null` branch, restated, not a hole.
 */
export declare function guardSpend(cfg: PoolGuardConfig, input: TokenAmount): Refusal | null;
/**
 * Live mint or freeze authority is a rejection unless the mint is explicitly
 * allowlisted. A `null`/`undefined` entry means we could not read the mint — also
 * a rejection. Token-2022 is refused for parity with the kernel's phase-1 stance.
 */
export declare function guardTokenAuthorities(cfg: PoolGuardConfig, mints: readonly (MintInfo | null | undefined)[]): Refusal | null;
/**
 * Rug-heat as a hard gate. A signals engine returns 60 for a mint
 * with no trades in the window, so "we have never seen this token trade" lands on
 * the reject side of the default threshold by construction — which is the point.
 */
export declare function guardRugHeat(cfg: PoolGuardConfig, heat: RugHeat | null | undefined): Refusal | null;
/** Pool TVL floor, denominated in the pool's quote asset. Unknown TVL is a refusal. */
export declare function guardPoolLiquidity(cfg: PoolGuardConfig, pool: PoolSummary): Refusal | null;
export interface LpSizingSubject {
    readonly pool: PoolSummary;
    /** Quote base units being added by this action. */
    readonly addQuote: bigint;
    /** Quote base units already in the position being added to (0 for a new one). */
    readonly existingPositionQuote: bigint;
    /** Every currently-open position, across all venues. */
    readonly openPositions: readonly LpPosition[];
    /** True when this action opens a brand-new position rather than topping one up. */
    readonly isNewPosition: boolean;
}
/** Per-position notional cap plus the concurrent-position count cap. */
export declare function guardLpSizing(cfg: PoolGuardConfig, s: LpSizingSubject): Refusal | null;
/**
 * The base (non-quote) leg of a two-sided deposit leaves the wallet too, and the
 * kernel's input-leg cap only sees the quote leg. Bound it as a share of current
 * holdings of that same mint — oracle-free, and it degrades to "reject" when the
 * holding is unknown.
 */
export declare function guardBaseLeg(cfg: PoolGuardConfig, args: {
    readonly baseAmount: bigint;
    readonly baseHoldings: bigint | null | undefined;
}): Refusal | null;
/** Level range sanity: ordered, finite, integral, and no wider than one position holds. */
export declare function guardLevelRange(cfg: PoolGuardConfig, range: {
    readonly lowerLevel: PriceLevel;
    readonly upperLevel: PriceLevel;
    readonly activeLevel: PriceLevel;
}): Refusal | null;
/** Bonding-curve slippage bound. Non-finite / negative slippage is a refusal. */
export declare function guardCurveSlippage(cfg: PoolGuardConfig, slippageBps: number): Refusal | null;
/**
 * Minimum-liquidity floor for a bonding curve, read off the curve's *real* SOL
 * reserves — the SOL actually withdrawable, not the virtual reserve that only
 * shapes the price. A fresh curve with 0.1 SOL in it cannot absorb an exit.
 */
export declare function guardCurveLiquidity(cfg: PoolGuardConfig, curve: {
    readonly realSolReserves: bigint | null | undefined;
    readonly complete: boolean;
}): Refusal | null;
export interface LpOpenSubject extends LpSizingSubject {
    readonly input: TokenAmount;
    readonly baseAmount: bigint;
    readonly baseHoldings: bigint | null | undefined;
    readonly mints: readonly (MintInfo | null | undefined)[];
    readonly rugHeat: RugHeat | null | undefined;
    readonly lowerLevel: PriceLevel;
    readonly upperLevel: PriceLevel;
}
/** Every guard that must pass before an LP open/add intent may be built. */
export declare function guardLpOpen(cfg: PoolGuardConfig, s: LpOpenSubject): Refusal | null;
export interface CurveTradeSubject {
    readonly input: TokenAmount;
    readonly slippageBps: number;
    readonly curve: {
        readonly realSolReserves: bigint | null | undefined;
        readonly complete: boolean;
    };
    readonly mints: readonly (MintInfo | null | undefined)[];
    readonly rugHeat: RugHeat | null | undefined;
}
/**
 * Every guard that must pass before a bonding-curve buy intent may be built.
 *
 * Note the deliberate asymmetry with `guardCurveSell`: a buy is discretionary and
 * gets the full gate; a sell is an *exit* and must never be blocked by rug-heat or
 * a liquidity floor — those are exactly the conditions under which you most want
 * out. Blocking exits is how a safety system becomes the rug.
 */
export declare function guardCurveBuy(cfg: PoolGuardConfig, s: CurveTradeSubject): Refusal | null;
/** Exit path: shape checks only. A migrated curve still redirects to Jupiter. */
export declare function guardCurveSell(cfg: PoolGuardConfig, s: {
    readonly input: TokenAmount;
    readonly slippageBps: number;
    readonly complete: boolean;
}): Refusal | null;
