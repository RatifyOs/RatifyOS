import type { FundingRate, LiquidationEstimate, PerpAccountStatus, PerpMarket, PerpPosition, PerpPrices } from "../types.js";
import type { AdjustPositionRequest, BlockhashSource, ClosePositionRequest, LiquidationQuery, OpenPositionRequest, PerpAccountRef, PerpsVenue, VenueOrderBuild } from "../venue.js";
import { type DriftSdkModule } from "./sdk-types.js";
/**
 * A signing-incapable wallet for the SDK.
 *
 * `DriftClient` requires a wallet object, but this adapter must never be able to
 * sign: it only reads state and builds unsigned transactions. Handing the SDK a
 * pubkey-only object whose sign methods throw makes that a structural
 * guarantee rather than a convention — if a future SDK version tried to sign
 * inside a build path, it would crash loudly instead of quietly producing a
 * signed transaction outside the kernel.
 */
export declare function readOnlyWallet(publicKey: unknown): Record<string, unknown>;
export interface DriftVenueOptions {
    /** `@solana/web3.js` Connection. Opaque here — the adapter never calls it directly. */
    readonly connection: unknown;
    /** The on-machine wallet's `PublicKey`. Wrapped in `readOnlyWallet` before the SDK sees it. */
    readonly publicKey: unknown;
    /** base58 owner pubkey, for the domain types. */
    readonly owner: string;
    /** Supplies the blockhash lifecycle the kernel owns. */
    readonly blockhash: BlockhashSource;
    readonly env?: "mainnet-beta" | "devnet";
    /**
     * Gate on building an account-initialisation transaction. Defaults to false:
     * creating on-chain state is its own explicit user decision, never a side
     * effect of a trade.
     */
    readonly allowAccountCreation?: boolean | undefined;
    readonly priorityFeeLamports?: number;
    readonly takerFeeBps?: number;
    /** Test seam. Production leaves this unset and the SDK is imported lazily. */
    readonly sdkLoader?: () => Promise<DriftSdkModule>;
}
/**
 * Drift v2 implementation of `PerpsVenue`.
 *
 * Reads venue state and builds UNSIGNED transactions. It holds no keypair, has
 * no broadcast path, and every method returns plain domain types — no Drift type
 * escapes this file.
 *
 * ── Verification status, stated plainly ──
 * This adapter is written against the documented `@drift-labs/sdk` v2 API and
 * has NOT been executed against a live RPC or a funded account. The SDK is an
 * optional peer dependency and is not installed in this workspace. Treat every
 * on-chain claim here as unverified until someone runs it with a real RPC.
 * What IS verified is everything downstream: the conversions in `convert.ts`,
 * the intent shape, and every guard are unit-tested against fakes, and they are
 * built to turn an adapter mistake into a refusal rather than a bad fill.
 */
export declare class DriftVenue implements PerpsVenue {
    #private;
    readonly id = "drift";
    constructor(opts: DriftVenueOptions);
    /**
     * Lazily import the SDK and subscribe. Idempotent and concurrency-safe: a
     * second caller awaits the first connect rather than building a second client.
     */
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    listMarkets(): Promise<readonly PerpMarket[]>;
    getMarket(symbol: string): Promise<PerpMarket>;
    getPrices(symbol: string): Promise<PerpPrices>;
    getFundingRate(symbol: string): Promise<FundingRate>;
    getPositions(account: PerpAccountRef): Promise<readonly PerpPosition[]>;
    estimateLiquidationPrice(query: LiquidationQuery): Promise<LiquidationEstimate>;
    getAccountStatus(account: PerpAccountRef): Promise<PerpAccountStatus>;
    /**
     * Build the subaccount-initialisation transaction — and ONLY when explicitly
     * enabled. This is the "explicit, separately-gated step" the architecture
     * calls for: no order-building path ever reaches it, so a trade can never
     * create an account as a side effect.
     */
    buildInitializeAccount(account: PerpAccountRef): Promise<VenueOrderBuild>;
    buildOpen(req: OpenPositionRequest): Promise<VenueOrderBuild>;
    buildAdjust(req: AdjustPositionRequest): Promise<VenueOrderBuild>;
    buildClose(req: ClosePositionRequest): Promise<VenueOrderBuild>;
}
