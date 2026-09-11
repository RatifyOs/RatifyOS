import type { PerpSide } from "./types.js";
/**
 * Liquidation maths — pure, synchronous, no I/O, no venue types.
 *
 * Derivation (isolated view of one position, maintenance-margin liquidation):
 *
 *   equity(P)      = C + s·(P − entry)      for a long
 *                  = C + s·(entry − P)      for a short
 *   maintenance(P) = m · s · P
 *
 * Liquidation is the price where equity(P) = maintenance(P):
 *
 *   long :  P = entry/(1−m) − C/(s·(1−m))  =  entry · (1 − 1/L) / (1 − m)
 *   short:  P = entry/(1+m) + C/(s·(1+m))  =  entry · (1 + 1/L) / (1 + m)
 *
 * where L = s·entry / C is the leverage. The two forms are equivalent; the
 * leverage form is used below because leverage is what policy caps.
 *
 * Sanity anchors (asserted in the tests):
 *   L = 1, m = 0  → long liquidates at 0 (never), short at 2× entry (correct).
 *   L = 10, m = 0.03 → long liquidates 7.2% below entry.
 *
 * CAVEAT, stated in the type system by `LiquidationEstimate.source`: on a
 * cross-margin venue (Drift is cross-margin by default) a single position's true
 * liquidation price depends on the whole account. This model is therefore a
 * CONSERVATIVE ISOLATED APPROXIMATION and an independent cross-check on the
 * venue's own number — never a replacement for it. `reconcileLiquidation` below
 * is what the guards actually consume, and it fails closed when the two
 * disagree.
 */
/** Numbers that came from a network hop are only trustworthy if they are finite and positive. */
export declare function isUsablePrice(x: number | undefined): x is number;
export interface ModelLiquidationArgs {
    readonly side: PerpSide;
    readonly entryPrice: number;
    readonly leverage: number;
    /** Maintenance margin ratio as a fraction in [0, 1). */
    readonly maintenanceMarginRatio: number;
}
/**
 * Model liquidation price from leverage. Returns `undefined` — never a guess —
 * when any input is unusable, so every caller is forced to handle the
 * missing-data case rather than silently trading on a NaN.
 */
export declare function modelLiquidationPrice(args: ModelLiquidationArgs): number | undefined;
/**
 * Distance from a reference price to the liquidation price, in basis points.
 * Always non-negative. Returns `undefined` if either price is unusable, or if
 * the position is already past liquidation on the wrong side (an ambiguous state
 * the guards must refuse rather than interpret).
 */
export declare function liquidationDistanceBps(args: {
    side: PerpSide;
    referencePrice: number;
    liquidationPrice: number;
}): number | undefined;
/** The maximum leverage at which a position still sits at least `minDistanceBps` from liquidation. */
export declare function maxLeverageForDistance(minDistanceBps: number, side: PerpSide, maintenanceMarginRatio: number): number | undefined;
export type LiquidationSource = "venue" | "model";
export interface ReconciledLiquidation {
    readonly liquidationPrice: number | undefined;
    readonly distanceBps: number | undefined;
    readonly source: LiquidationSource;
    /** Set when NO usable estimate exists. Callers MUST fail closed on it. */
    readonly ambiguity: string | undefined;
    /** |venue − model| in bps when both were usable, else undefined. */
    readonly disagreementBps: number | undefined;
    /** True when the two estimates disagree beyond tolerance — a warning, not a refusal (see below). */
    readonly disagrees: boolean;
}
/**
 * Reconcile the venue's liquidation estimate with the independent model, and
 * always take the CONSERVATIVE one — the estimate that puts liquidation closest
 * to the current price.
 *
 * Why "take the minimum distance" rather than "refuse when they disagree":
 * taking the minimum already fails closed in both directions. If the venue
 * number is wrong in the SAFE direction (say a units bug reporting liquidation
 * 100× further away), the model wins and the position is judged on the model. If
 * it is wrong in the DANGEROUS direction, the venue wins and the intent is
 * refused for being too close. Refusing on disagreement would add no safety on
 * top of that, and would produce false refusals on a cross-margin venue, where
 * the venue legitimately reports a farther liquidation because other collateral
 * backs the position. Drift is cross-margin by default, so that case is the
 * common one, not the exception.
 *
 * The one genuine ambiguity — neither source produced a usable number — IS a
 * refusal, via `ambiguity`.
 */
export declare function reconcileLiquidation(args: {
    side: PerpSide;
    referencePrice: number;
    venuePrice: number | undefined;
    modelPrice: number | undefined;
    toleranceBps: number;
}): ReconciledLiquidation;
/** Absolute divergence between mark and oracle, in bps of the oracle price. */
export declare function oracleDivergenceBps(markPrice: number, oraclePrice: number): number | undefined;
