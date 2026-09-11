import type { ChainReader } from "../chain.js";
import type { AmmVenue, ClaimFeesRequest, ListPoolsQuery, LpPosition, OpenLiquidityRequest, PoolSummary, RemoveLiquidityRequest, VenueTxDraft } from "../types.js";
import type { DataApiPool, MeteoraDataApi } from "./dlmm-api.js";
import { type DlmmSdk, type SdkPoolState, type SdkPosition } from "./sdk-port.js";
export declare const METEORA_DLMM_VENUE_ID = "meteora-dlmm";
/**
 * Meteora DLMM as an `AmmVenue`.
 *
 * Two sources, each used for what it is actually good at:
 *
 *  - the **keyless data API** for discovery and the economics a rebalance needs
 *    (TVL, 24h fees, APR) — no RPC credits, but it has no notion of the active
 *    bin, so any bin id derived from it is a display approximation;
 *  - the **SDK port** for authoritative on-chain state (`activeId`, reserves,
 *    positions) and for building transactions.
 *
 * `getPool` prefers the SDK and marks API-derived answers, so nothing downstream
 * ever mistakes a price-inverted bin estimate for the real active bin.
 *
 * Orientation convention: DLMM prices token **Y per X**, so `base = tokenX` and
 * `quote = tokenY` throughout. A pool whose Y side is not SOL or USDC therefore
 * has no supported quote asset, and `guardPoolLiquidity` refuses it — which is the
 * correct outcome, not an oversight.
 */
export declare class MeteoraDlmmVenue implements AmmVenue {
    #private;
    readonly id = "meteora-dlmm";
    constructor(deps: {
        sdk: DlmmSdk;
        api?: MeteoraDataApi;
        chain: ChainReader;
    });
    listPools(query: ListPoolsQuery): Promise<readonly PoolSummary[]>;
    getPool(address: string): Promise<PoolSummary>;
    getPosition(poolAddress: string, positionAddress: string, owner: string): Promise<LpPosition | null>;
    listPositions(owner: string, poolAddress?: string): Promise<readonly LpPosition[]>;
    buildOpen(req: OpenLiquidityRequest): Promise<VenueTxDraft>;
    buildRemove(req: RemoveLiquidityRequest): Promise<VenueTxDraft>;
    buildClaimFees(req: ClaimFeesRequest): Promise<VenueTxDraft>;
}
/** UI float → base units without float drift, refusing values outside `toFixed` range. */
export declare function uiToBaseUnits(value: number | undefined, decimals: number): bigint | undefined;
export declare function summaryFromSdk(state: SdkPoolState, api?: DataApiPool): PoolSummary;
/**
 * Summary from the data API alone. `activeLevel` is *derived* from `current_price`
 * because the API does not report the active bin — good enough to rank pools, not
 * good enough to position liquidity, which is why every builder re-reads the pool
 * through the SDK first.
 */
export declare function summaryFromApi(p: DataApiPool): PoolSummary;
export declare function positionFromSdk(p: SdkPosition, state: SdkPoolState): LpPosition;
