/**
 * DLMM bin mathematics — pure, no SDK, no network, no `BN`.
 *
 * The bin model *is* the product, so it is modelled here rather than papered over
 * as a constant-product pool. Every bin is a fixed price step wide:
 *
 *     price(binId) = (1 + binStep / 10_000) ^ binId          [in lamport terms]
 *     uiPrice      = price(binId) * 10 ^ (baseDec - quoteDec)
 *
 * Liquidity in a bin trades at exactly that price with **zero slippage inside the
 * bin**; a swap walks bin by bin. A position owns a contiguous run of bins, and
 * only the bins at or around the active bin earn fees. Two consequences drive
 * everything downstream: a position whose range no longer contains the active bin
 * earns **nothing**, and a position sitting entirely below the active bin is 100%
 * quote while one entirely above it is 100% base.
 *
 * Constants below are the on-chain ones from the DLMM IDL, not guesses:
 * `DEFAULT_BIN_PER_POSITION = 70`, `MAX_BIN_PER_ARRAY = 70`, `MAX_BIN_STEP = 400`,
 * `MAX_BIN_ID_PER_BIN_STEP = 351639`, `BASIS_POINT_MAX = 10_000`.
 */
import type { LiquidityShape, PriceLevel } from "../types.js";
export declare const BASIS_POINT_MAX = 10000;
/** Bins a single position account can hold (`DEFAULT_BIN_PER_POSITION`). */
export declare const MAX_BIN_PER_POSITION = 70;
/** Bins per bin-array account (`MAX_BIN_PER_ARRAY`). */
export declare const MAX_BIN_PER_ARRAY = 70;
export declare const MAX_BIN_STEP = 400;
export declare const MAX_BIN_ID = 351639;
export declare const MIN_BIN_ID = -351639;
export declare class BinMathError extends RangeError {
}
/** Price of a bin in lamport terms: `(1 + binStep/10_000) ^ binId`. */
export declare function priceOfBin(binId: PriceLevel, binStep: number): number;
/** UI price (quote per 1 base) of a bin, decimal-adjusted. Display only — never cap math. */
export declare function uiPriceOfBin(binId: PriceLevel, binStep: number, baseDecimals: number, quoteDecimals: number): number;
/** The bin whose price floor is at or below `price` (lamport terms). Inverse of `priceOfBin`. */
export declare function binOfPrice(price: number, binStep: number): PriceLevel;
export declare function binOfUiPrice(uiPrice: number, binStep: number, baseDecimals: number, quoteDecimals: number): PriceLevel;
/** Inclusive bin count of a range. */
export declare function binSpan(lowerBinId: PriceLevel, upperBinId: PriceLevel): number;
/** Price width of a range, as a percentage: `((1+s)^span - 1) * 100`. */
export declare function rangeWidthPct(lowerBinId: PriceLevel, upperBinId: PriceLevel, binStep: number): number;
export interface BinRange {
    readonly lowerBinId: PriceLevel;
    readonly upperBinId: PriceLevel;
}
/**
 * A range centred on the active bin, clamped to what one position account holds.
 * `below`/`above` are bin counts; the active bin itself is always included.
 */
export declare function rangeAroundActive(activeBinId: PriceLevel, below: number, above: number, maxSpan?: number): BinRange;
export declare function isActiveInRange(range: BinRange, activeBinId: PriceLevel): boolean;
/**
 * Signed drift of the active bin relative to a range, **in bins**.
 *  - `0`  active bin is inside the range (position is earning)
 *  - `>0` active bin is above `upperBinId` by that many bins (position went 100% base)
 *  - `<0` active bin is below `lowerBinId` (position went 100% quote)
 */
export declare function binDrift(range: BinRange, activeBinId: PriceLevel): number;
/**
 * How far through the range the active bin sits, 0..1 (0 = at the lower edge).
 * Returns `null` when the active bin is outside the range. Used by the rebalancer
 * to fire on *approaching* an edge, not only on having already fallen out of it.
 */
export declare function activePositionInRange(range: BinRange, activeBinId: PriceLevel): number | null;
/**
 * Bin-array indices a range touches. Bin arrays are the on-chain accounts that
 * must exist (and be rent-paid) before liquidity can live in a bin, so the count
 * of *new* arrays a range needs is a real cost input to the rebalance decision.
 */
export declare function binArrayIndicesFor(range: BinRange): readonly number[];
/**
 * Relative weight per bin for a shape. Weights are unnormalised and strictly
 * positive; `distributeAmount` turns them into exact base-unit amounts.
 *
 * These mirror the *shape* of Meteora's `StrategyType` (Spot / Curve / BidAsk) so
 * previews and rebalance economics are computed against the right silhouette. They
 * are not a bit-for-bit reimplementation of the on-chain weight math — the actual
 * per-bin amounts are produced by the SDK from `strategyType`, and this package
 * never sends its own weights on-chain.
 */
export declare function shapeWeights(shape: LiquidityShape, range: BinRange, activeBinId: PriceLevel): readonly number[];
/**
 * Split `total` base units across `weights` with **no dust lost or invented**.
 *
 * Largest-remainder apportionment, entirely in `bigint`: floor each share against
 * the integer weight sum, then hand the shortfall out one unit at a time to the
 * bins with the largest truncated remainder. Because every share is floored, the
 * assigned sum is never above `total` and the shortfall is strictly smaller than
 * the bin count — so the loop terminates and the result sums to exactly `total`.
 * (Scaling each weight independently and hoping the rounding cancels does *not*
 * have that property; 70 equal bins overshoot by 2e-5 that way.)
 */
export declare function distributeAmount(total: bigint, weights: readonly number[]): readonly bigint[];
/** Per-bin allocation of a deposit: which bin, its price, and how much lands there. */
export interface BinAllocation {
    readonly binId: PriceLevel;
    readonly uiPrice: number;
    readonly amount: bigint;
}
/**
 * Preview a deposit's per-bin breakdown. DLMM funds bins strictly below the active
 * bin with **quote** and strictly above it with **base**; the active bin can take
 * both. `side` selects which asset this call is laying out.
 */
export declare function planDeposit(args: {
    readonly range: BinRange;
    readonly activeBinId: PriceLevel;
    readonly binStep: number;
    readonly shape: LiquidityShape;
    readonly amount: bigint;
    readonly side: "base" | "quote";
    readonly baseDecimals: number;
    readonly quoteDecimals: number;
}): readonly BinAllocation[];
/**
 * Divergence ("impermanent") loss versus simply holding, for a price that moved by
 * ratio `r = priceNow / priceEntry`, as a **negative** percentage.
 *
 *     IL(r) = 2·√r / (1 + r) − 1
 *
 * This is the constant-product closed form. A DLMM position over a finite range is
 * *more* divergent than this inside the range and stops diverging once price exits
 * it, so treating this as the estimate is deliberately conservative-ish rather than
 * exact — it is used to make a rebalance harder to justify, never easier.
 */
export declare function divergenceLossPct(priceRatio: number): number;
