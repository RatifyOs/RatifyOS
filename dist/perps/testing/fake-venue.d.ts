import { type TokenAmount } from "../../kernel/money.js";
import type { FundingRate, LiquidationEstimate, PerpAccountStatus, PerpMarket, PerpPosition, PerpPrices, PerpSide } from "../types.js";
import type { AdjustPositionRequest, ClosePositionRequest, LiquidationQuery, OpenPositionRequest, PerpAccountRef, PerpsVenue, VenueOrderBuild } from "../venue.js";
/**
 * An in-memory `PerpsVenue` for tests and for a network-free dry run.
 *
 * Every knob a test needs to drive a rejection path is a plain field, so the
 * tests read as scenarios rather than as mock setup. Nothing here touches the
 * network — that is the point.
 */
export declare const FAKE_BASE_PRECISION = 1000000000n;
export declare function fakeMarket(overrides?: Partial<PerpMarket>): PerpMarket;
export declare function usdc(amount: bigint): TokenAmount;
export declare function fakePrices(overrides?: Partial<PerpPrices>): PerpPrices;
export declare function fakeFunding(overrides?: Partial<FundingRate>): FundingRate;
export declare function fakePosition(overrides?: Partial<PerpPosition>): PerpPosition;
export interface FakeVenueOptions {
    markets?: PerpMarket[];
    prices?: PerpPrices;
    funding?: FundingRate | null;
    positions?: PerpPosition[];
    accountExists?: boolean;
    allowAccountCreation?: boolean;
    /** What every build reports as the venue liquidation estimate. `null` = none. */
    liquidationPrice?: number | null;
    /** Force the next read to throw, to drive the fail-closed paths. */
    readError?: string | null;
}
export declare class FakePerpsVenue implements PerpsVenue {
    #private;
    readonly id = "fake";
    markets: PerpMarket[];
    prices: PerpPrices;
    funding: FundingRate | null;
    positions: PerpPosition[];
    accountExists: boolean;
    allowAccountCreation: boolean;
    liquidationPrice: number | null;
    readError: string | null;
    /** Every build this venue produced, for assertions. */
    readonly builds: VenueOrderBuild[];
    constructor(opts?: FakeVenueOptions);
    listMarkets(): Promise<readonly PerpMarket[]>;
    getMarket(symbol: string): Promise<PerpMarket>;
    getPrices(symbol: string): Promise<PerpPrices>;
    getFundingRate(symbol: string): Promise<FundingRate>;
    getPositions(_account: PerpAccountRef): Promise<readonly PerpPosition[]>;
    estimateLiquidationPrice(query: LiquidationQuery): Promise<LiquidationEstimate>;
    getAccountStatus(account: PerpAccountRef): Promise<PerpAccountStatus>;
    buildInitializeAccount(_account: PerpAccountRef): Promise<VenueOrderBuild>;
    buildOpen(req: OpenPositionRequest): Promise<VenueOrderBuild>;
    buildAdjust(req: AdjustPositionRequest): Promise<VenueOrderBuild>;
    buildClose(req: ClosePositionRequest): Promise<VenueOrderBuild>;
}
export declare function fakeSide(side: PerpSide): PerpSide;
