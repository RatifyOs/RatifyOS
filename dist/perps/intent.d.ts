import { type MintProvenance, type PerpIntentKind, type TradeIntent } from "../kernel/contracts.js";
import { type TokenAmount } from "../kernel/money.js";
import type { FundingRate, PerpMarket, PerpMarketStatus, PerpOrderType, PerpPrices, PerpSide } from "./types.js";
import type { PerpAccountRef, VenueOrderBuild } from "./venue.js";
/**
 * The four perp kinds are declared by the kernel, not here: `IntentKind`
 * includes them, so `staticGuards` recognises a perp intent and selects the
 * venue-position settle for it. Re-exported for callers that only import this
 * module.
 */
export type { PerpIntentKind } from "../kernel/contracts.js";
export { PERP_INTENT_KINDS } from "../kernel/contracts.js";
/** Reducing kinds may still run under wind-down / kill-switch: the agent must always be able to get flat. */
export declare function isReducingKind(kind: PerpIntentKind): boolean;
/** Opening kinds ADD risk and carry the full entry-quality guard set. */
export declare function isOpeningKind(kind: PerpIntentKind): boolean;
/**
 * The perp-specific half of an intent. Everything a guard needs to decide, and
 * nothing it has to fetch: guards are pure functions of `(intent, policy,
 * exposure, position)`, so the entire safety layer is unit-testable with no
 * network and no clock.
 */
export interface PerpLeg {
    readonly venue: string;
    /** Canonical market symbol, e.g. 'SOL-PERP'. */
    readonly market: string;
    /** Opaque venue handle, carried for the journal. Never interpreted by a guard. */
    readonly venueMarketIndex: number;
    readonly accountSubId: number;
    readonly side: PerpSide;
    readonly orderType: PerpOrderType;
    readonly limitPrice: number | undefined;
    readonly reduceOnly: boolean;
    readonly leverage: number;
    readonly slippageBps: number;
    readonly baseDecimals: number;
    /** Expected and worst-case filled base size — the perps analogue of out / min-out. */
    readonly expectedBaseAmount: bigint;
    readonly minBaseAmount: bigint;
    /** The margin leaving the wallet. Always identical to `TradeIntent.input`. */
    readonly collateral: TokenAmount;
    /** collateral × leverage, in the COLLATERAL asset's base units. No oracle in this number. */
    readonly notional: TokenAmount;
    readonly entryPrice: number;
    readonly markPrice: number;
    readonly oraclePrice: number;
    readonly maintenanceMarginRatio: number;
    readonly marketStatus: PerpMarketStatus;
    /** The venue's own liquidation estimate. `undefined` makes the intent ambiguous, and the guards refuse it. */
    readonly venueLiquidationPrice: number | undefined;
    /** Signed bps/hour; `undefined` is refused rather than assumed to be zero. */
    readonly fundingBpsPerHour: number | undefined;
}
/**
 * A perp intent.
 *
 * Structurally a `TradeIntent` with a widened `kind` plus the `perp` leg, so the
 * ENTIRE existing kernel chokepoint applies to it unchanged:
 *
 *   • kill switch / executionEnabled            — unchanged
 *   • input-leg spend cap reserve→consume       — unchanged, and it caps the MARGIN
 *   • priority-fee ceiling (abs + bps)          — unchanged
 *   • mint allow/deny + Token-2022 detection    — unchanged
 *   • untrusted-provenance confirmation         — unchanged
 *   • slippage clamp                            — unchanged (see `quote.slippageBps`)
 *   • idempotency, persist-before-broadcast,
 *     terminal expiry, reconciler               — unchanged
 *
 * The LLM still cannot move money: a perp tool returns one of these and stops.
 *
 * ── The one place the swap-shaped kernel does NOT transfer ──
 * A perp fill does not move a token balance — it changes a position on the
 * venue — so a balance-delta settle cannot verify one. On an open the
 * collateral mint is BOTH legs, which makes the output delta negative and a
 * balance check fire a shortfall on every success.
 *
 * The kernel therefore settles a perp kind against the venue instead: it reads
 * the signed position through `PositionReader` before signing and again after
 * confirmation, and requires the change to move in the ORDER's direction by at
 * least `perp.minBaseAmount`. That is why the token quote is neutralised here:
 *
 *   quote.outAmount = quote.minOutAmount = 0n   ("no token output leg")
 *
 * which makes the min-out consistency check a no-op instead of a false
 * positive, while `perp.expectedBaseAmount` / `perp.minBaseAmount` carry the
 * real fill bounds. A perp intent with no position reader mounted is refused
 * (`SETTLE_UNVERIFIABLE`) before broadcast — fail-closed, never unverified.
 */
export interface PerpIntent extends Omit<TradeIntent, "kind"> {
    readonly kind: PerpIntentKind;
    readonly perp: PerpLeg;
}
export interface BuildPerpIntentArgs {
    readonly kind: PerpIntentKind;
    /** The tool that built it, e.g. 'perps_open'. */
    readonly source: string;
    readonly market: PerpMarket;
    readonly account: PerpAccountRef;
    readonly side: PerpSide;
    readonly orderType: PerpOrderType;
    readonly limitPrice: number | undefined;
    readonly slippageBps: number;
    readonly leverage: number;
    /** The margin leaving the wallet (zero-amount for a pure reduce/close). */
    readonly collateral: TokenAmount;
    readonly prices: PerpPrices;
    readonly funding: FundingRate | undefined;
    readonly build: VenueOrderBuild;
    readonly collateralProvenance: MintProvenance;
}
/** Pure assembly. Does no validation of its own — that is `perpGuards`' job, deliberately. */
export declare function buildPerpIntent(args: BuildPerpIntentArgs): PerpIntent;
export declare function summarizePerpIntent(args: {
    kind: PerpIntentKind;
    perp: PerpLeg;
    market: PerpMarket;
}): string;
/**
 * Runtime structural validation. Fails CLOSED — anything missing, mistyped, or
 * out of range is a refusal, never a coerced default. Called by `perpGuards`
 * before any policy comparison so no later rule can read a NaN.
 */
export declare function assertPerpIntentShape(value: unknown): asserts value is PerpIntent;
/**
 * The single bridge from a perp intent to the kernel's `TradeIntent`.
 *
 * There is no cast: `IntentKind` includes the four perp kinds and `TradeIntent`
 * declares an optional `perp` leg that `PerpLeg` satisfies structurally, so a
 * `PerpIntent` simply IS a `TradeIntent`. What this function still buys is the
 * structural validation — the intent is checked here, where the error names the
 * builder, before the kernel re-validates it from scratch at the chokepoint.
 */
export declare function asTradeIntent(intent: PerpIntent): TradeIntent;
