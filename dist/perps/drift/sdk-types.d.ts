/**
 * Structural types for the lazily-imported `@drift-labs/sdk`.
 *
 * The SDK is a PEER DEPENDENCY, marked optional, and is never imported
 * statically. That is deliberate: it is a very heavy tree (anchor, the full
 * Solana stack, a websocket account subscriber) and pulling it into the
 * workspace would make every other package's install pay for perps. Declaring
 * the shapes we actually touch here means:
 *
 *   • `packages/perps` typechecks with the SDK absent,
 *   • the tests run with the SDK absent,
 *   • and NOTHING outside `src/drift/` ever sees a Drift type.
 *
 * The trade-off is stated plainly: these declarations are written against the
 * documented v2 API surface and have NOT been verified against an installed
 * SDK build. Every extraction in `drift-venue.ts` is therefore defensive — a
 * field that is missing or shaped differently raises `PerpsVenueError`, and a
 * value that comes out mis-scaled runs into the guards' sanity bounds. Both
 * failure modes are refusals, not bad trades.
 */
/** Anchor's BN. `toString()` is the only member we rely on. */
export interface Bn {
    toString(radix?: number): string;
    isNeg?(): boolean;
}
/** Anchor enums deserialize as a single-key object, e.g. `{ active: {} }`. */
export type AnchorEnum = Record<string, unknown>;
export interface DriftOraclePriceData {
    price: Bn;
    slot?: Bn;
    confidence?: Bn;
    hasSufficientNumberOfDataPoints?: boolean;
}
export interface DriftAmm {
    oracle?: unknown;
    lastFundingRate?: Bn;
    lastFundingRateLong?: Bn;
    lastFundingRateShort?: Bn;
    last24hAvgFundingRate?: Bn;
    historicalOracleData?: {
        lastOraclePriceTwap?: Bn;
        lastOraclePriceTwap5Min?: Bn;
    };
    baseAssetAmountStepSize?: Bn;
    minOrderSize?: Bn;
    orderStepSize?: Bn;
}
export interface DriftPerpMarketAccount {
    marketIndex: number;
    /** ASCII bytes, space padded, e.g. 'SOL-PERP'. */
    name: number[];
    status: AnchorEnum;
    /** MARGIN_PRECISION (1e4). */
    marginRatioInitial: number;
    marginRatioMaintenance: number;
    amm: DriftAmm;
}
export interface DriftPerpPosition {
    marketIndex: number;
    /** BASE_PRECISION (1e9), signed: negative = short. */
    baseAssetAmount: Bn;
    /** QUOTE_PRECISION (1e6), signed. */
    quoteEntryAmount: Bn;
    quoteAssetAmount?: Bn;
}
export interface DriftUserAccount {
    subAccountId: number;
    perpPositions: DriftPerpPosition[];
}
export interface DriftUser {
    getUserAccount(): DriftUserAccount;
    getPerpPosition(marketIndex: number): DriftPerpPosition | undefined;
    /** QUOTE_PRECISION. */
    getFreeCollateral(): Bn;
    getTotalCollateral(): Bn;
    /** PRICE_PRECISION; negative (typically -1) means "no liquidation price". */
    liquidationPrice(marketIndex: number, positionBaseSizeChange?: Bn, estimatedEntryPrice?: Bn): Bn;
    getPerpPositionValue?(marketIndex: number, oracleData: DriftOraclePriceData): Bn;
    exists?(): boolean;
}
export interface DriftOrderParams {
    marketIndex: number;
    marketType: unknown;
    direction: unknown;
    baseAssetAmount: Bn;
    reduceOnly: boolean;
    price?: Bn;
    orderType?: unknown;
}
/** Whatever the SDK hands back from `buildTransaction` — we only serialize it. */
export interface DriftBuiltTransaction {
    serialize(): Uint8Array;
    message?: {
        recentBlockhash?: string;
    };
}
export interface DriftClientLike {
    subscribe(): Promise<boolean>;
    unsubscribe(): Promise<void>;
    getPerpMarketAccounts(): DriftPerpMarketAccount[];
    getPerpMarketAccount(marketIndex: number): DriftPerpMarketAccount | undefined;
    getOracleDataForPerpMarket(marketIndex: number): DriftOraclePriceData;
    getUser(subAccountId?: number): DriftUser;
    getUserAccount(subAccountId?: number): DriftUserAccount | undefined;
    getPlacePerpOrderIx(params: DriftOrderParams, subAccountId?: number): Promise<unknown>;
    getInitializeUserInstructions(subAccountId: number, name?: string): Promise<[unknown, unknown, unknown]>;
    buildTransaction(ixs: unknown[], txParams?: unknown, txVersion?: unknown, lookupTables?: unknown[]): Promise<DriftBuiltTransaction>;
    fetchMarketLookupTableAccount?(): Promise<unknown>;
    switchActiveUser?(subAccountId: number): Promise<void>;
}
/** The module-level exports we call. Anything absent degrades to a documented fallback. */
export interface DriftSdkModule {
    DriftClient: new (config: Record<string, unknown>) => DriftClientLike;
    Wallet?: new (payer: unknown) => unknown;
    PositionDirection: {
        LONG: unknown;
        SHORT: unknown;
    };
    MarketType: {
        PERP: unknown;
        SPOT: unknown;
    };
    OrderType?: {
        MARKET: unknown;
        LIMIT: unknown;
    };
    BN: new (value: string | number) => Bn;
    getMarketOrderParams?: (params: Record<string, unknown>) => DriftOrderParams;
    getLimitOrderParams?: (params: Record<string, unknown>) => DriftOrderParams;
    calculateReservePrice?: (market: DriftPerpMarketAccount, oracle: DriftOraclePriceData) => Bn;
    calculateEstimatedPerpEntryPrice?: (assetType: string, amount: Bn, direction: unknown, market: DriftPerpMarketAccount, oracle: DriftOraclePriceData) => {
        entryPrice: Bn;
        priceImpact?: Bn;
        bestPrice?: Bn;
        worstPrice?: Bn;
    };
    calculateLongShortFundingRate?: (market: DriftPerpMarketAccount) => [Bn, Bn];
}
export declare const BASE_PRECISION = 1000000000n;
export declare const QUOTE_PRECISION = 1000000n;
export declare const PRICE_PRECISION = 1000000n;
export declare const MARGIN_PRECISION = 10000n;
export declare const FUNDING_RATE_BUFFER = 1000n;
export declare const BASE_DECIMALS = 9;
export declare const QUOTE_DECIMALS = 6;
export declare function bnToBigInt(value: Bn | undefined | null): bigint | undefined;
/** A fixed-point BN → JS number, for display and price maths (never for cap maths). */
export declare function bnToNumber(value: Bn | undefined | null, precision: bigint): number | undefined;
export declare function absBigInt(x: bigint): bigint;
/** Decode Drift's space-padded ASCII byte-array market name. */
export declare function decodeMarketName(name: number[] | undefined): string | undefined;
/** The single key of an anchor enum object, e.g. `{ reduceOnly: {} }` → 'reduceOnly'. */
export declare function anchorEnumKey(value: AnchorEnum | undefined): string | undefined;
