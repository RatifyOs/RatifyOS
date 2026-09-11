import type { PerpMarket, PerpMarketStatus } from "../types.js";
import { type Bn, type DriftPerpMarketAccount } from "./sdk-types.js";
/**
 * Pure Drift→domain conversions.
 *
 * Kept out of `drift-venue.ts` on purpose: these are the parts with real
 * arithmetic in them, and being SDK-free functions of plain values they are
 * unit-tested directly. The adapter around them is then only plumbing.
 */
export declare const DRIFT_VENUE_ID = "drift";
/** Drift perps settle in USDC; quote precision is 1e6, i.e. USDC base units exactly. */
export declare const DRIFT_SETTLEMENT_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/**
 * Map Drift's market status enum to the domain status.
 * Anything unrecognised becomes 'unknown', which the guards refuse — a new
 * status variant appearing in a future SDK must not silently read as tradeable.
 */
export declare function driftMarketStatus(key: string | undefined): PerpMarketStatus;
/**
 * Drift's hourly funding rate → signed basis points per hour.
 *
 * `amm.lastFundingRate` is stored in PRICE_PRECISION × FUNDING_RATE_BUFFER
 * (1e6 × 1e3 = 1e9). Dividing out the buffer leaves a PRICE_PRECISION quantity,
 * which divided by the PRICE_PRECISION oracle TWAP yields a dimensionless
 * hourly fraction; ×10 000 makes it bps.
 *
 *   bps/h = (lastFundingRate / 1e3) / oracleTwap × 10 000
 *
 * Worked check: SOL at $150 (twap = 150_000_000) with a 0.001%/h rate gives
 * lastFundingRate = 1_500_000 and this returns 0.1 bps/h. Pinned in the tests.
 *
 * Positive = longs pay shorts, matching `FundingRate.bpsPerHour`.
 *
 * If this conversion is mis-scaled against a future SDK, the result lands far
 * outside the guards' `maxFundingRateBpsPerHour` sanity bound and the intent is
 * refused. The failure mode is a refusal, not a bad fill.
 */
export declare function fundingBpsPerHour(lastFundingRate: bigint | undefined, oracleTwap: bigint | undefined): number | undefined;
/** Drift stores margin ratios in MARGIN_PRECISION (1e4); the domain wants a fraction. */
export declare function marginRatioToFraction(ratio: number | undefined): number | undefined;
export declare function maxLeverageFromInitialMargin(initialMarginFraction: number | undefined): number | undefined;
export interface DriftMarketConversion {
    readonly market: PerpMarket | undefined;
    readonly problem: string | undefined;
}
/**
 * Convert a Drift perp market account. Returns a `problem` string instead of a
 * market whenever a safety-relevant field is missing — the caller drops the
 * market rather than synthesising a default margin ratio.
 */
export declare function toPerpMarket(account: DriftPerpMarketAccount, takerFeeBps: number): DriftMarketConversion;
/** BASE_PRECISION size → domain base units (identical scale, but the intent is explicit). */
export declare function baseAmountToUnits(amount: Bn | undefined): bigint | undefined;
/** Absolute base size and the side implied by a signed Drift position. */
export declare function splitSignedBase(signed: bigint): {
    side: "long" | "short";
    magnitude: bigint;
};
/**
 * Notional in QUOTE (USDC) base units from a base-precision size and a
 * PRICE_PRECISION price — integer maths throughout, so this never drifts.
 *
 *   notional = |base| × price / BASE_PRECISION      (price already 1e6 = USDC scale)
 */
export declare function notionalQuoteUnits(baseUnits: bigint, pricePrecisionPrice: bigint): bigint;
/** A PRICE_PRECISION BN → a plain price. Negative (Drift's "no liquidation price") becomes undefined. */
export declare function priceFrom(value: Bn | undefined, opts?: {
    negativeMeans?: "undefined" | "zero";
}): number | undefined;
