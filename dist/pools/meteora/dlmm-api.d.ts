export interface DataApiToken {
    readonly address: string;
    readonly name?: string;
    readonly symbol?: string;
    readonly decimals: number;
    readonly is_verified?: boolean;
    readonly freeze_authority_disabled?: boolean;
    readonly price?: number;
}
export interface DataApiPool {
    readonly address: string;
    readonly name?: string;
    readonly token_x: DataApiToken;
    readonly token_y: DataApiToken;
    readonly token_x_amount?: number;
    readonly token_y_amount?: number;
    readonly created_at?: number;
    readonly pool_config?: {
        readonly bin_step: number;
        readonly base_fee_pct?: number;
        readonly max_fee_pct?: number;
        readonly protocol_fee_pct?: number;
    };
    readonly dynamic_fee_pct?: number;
    readonly tvl?: number;
    readonly current_price?: number;
    readonly apr?: number;
    readonly apy?: number;
    readonly volume?: Record<string, number>;
    readonly fees?: Record<string, number>;
    readonly is_blacklisted?: boolean;
    readonly launchpad?: string;
    readonly tags?: readonly string[];
}
export interface ListResult {
    readonly pools: readonly DataApiPool[];
    /** How many pools were examined before filtering — the honest scope of the answer. */
    readonly scannedPools: number;
    /** True when the scan window was exhausted, i.e. the answer may be incomplete. */
    readonly truncated: boolean;
}
export interface MeteoraDataApiOptions {
    readonly baseUrl?: string;
    readonly fetchImpl?: typeof fetch;
    readonly maxPages?: number;
    readonly pageSize?: number;
    readonly timeoutMs?: number;
}
export declare class MeteoraDataApiError extends Error {
}
export declare class MeteoraDataApi {
    #private;
    constructor(opts?: MeteoraDataApiOptions);
    getPool(address: string): Promise<DataApiPool>;
    /**
     * Deepest pools containing `mint` on either side. Scans at most
     * `maxPages × pageSize` pools ordered by TVL and filters locally — see the file
     * header for why. Blacklisted pools are dropped unconditionally.
     */
    listPoolsForMint(mint: string, limit?: number): Promise<ListResult>;
}
