import type { TokenAmount } from "../../kernel/money.js";
import { type PortfolioExposure } from "../exposure.js";
import type { PerpGuardContext } from "../guards.js";
import { type PerpIntent, type PerpIntentKind, type PerpLeg } from "../intent.js";
import { type PerpsPolicy } from "../policy.js";
import type { PerpMarket, PerpPosition, PerpSide } from "../types.js";
import type { VenueOrderBuild } from "../venue.js";
/**
 * Fixtures for the guard tests.
 *
 * The baseline is a deliberately UNREMARKABLE trade that passes every rule:
 * 3× long SOL-PERP at $150 with 50 USDC of margin (150 USDC notional, 1 SOL).
 * Model liquidation lands at $103.09 (3127bps away) and the venue reports $105
 * (3000bps) — both clear of the 2000bps floor. Each test then perturbs exactly
 * one field, so a failure names the rule that broke.
 */
export declare const BASELINE: {
    readonly markPrice: 150;
    readonly collateral: 50000000n;
    readonly leverage: 3;
    readonly notional: 150000000n;
    readonly baseAmount: 1000000000n;
    readonly slippageBps: 50;
    readonly venueLiquidationPrice: 105;
};
export declare function testPolicy(overrides?: Partial<PerpsPolicy>): PerpsPolicy;
export declare function testExposure(overrides?: Partial<PortfolioExposure>): PortfolioExposure;
export declare function testCtx(overrides?: Partial<PerpGuardContext>): PerpGuardContext;
export declare function testBuild(overrides?: Partial<VenueOrderBuild>): VenueOrderBuild;
export interface IntentOverrides {
    kind?: PerpIntentKind;
    side?: PerpSide;
    leverage?: number;
    collateral?: TokenAmount;
    slippageBps?: number;
    market?: PerpMarket;
    build?: Partial<VenueOrderBuild>;
    fundingBpsPerHour?: number | null;
    markPrice?: number;
    oraclePrice?: number;
    /** Applied last, so a test can force any field — including invalid ones. */
    perp?: Partial<PerpLeg>;
}
export declare function testIntent(o?: IntentOverrides): PerpIntent;
export declare function testPosition(overrides?: Partial<PerpPosition>): PerpPosition;
