import { z } from "zod";
export type Source = "blockscout" | "dexscreener" | "geckoterminal";
export declare class IntelligenceError extends Error {
    source: Source;
    code: "TIMEOUT" | "RATE_LIMITED" | "HTTP_ERROR" | "INVALID_RESPONSE" | "NETWORK_ERROR";
    status?: number | undefined;
    retryAfterMs?: number | undefined;
    cause?: unknown | undefined;
    constructor(source: Source, code: "TIMEOUT" | "RATE_LIMITED" | "HTTP_ERROR" | "INVALID_RESPONSE" | "NETWORK_ERROR", message: string, status?: number | undefined, retryAfterMs?: number | undefined, cause?: unknown | undefined);
}
type Options = {
    fetch?: typeof globalThis.fetch;
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
};
declare class HttpClient {
    protected source: Source;
    protected baseUrl: string;
    protected fetchFn: typeof fetch;
    private timeout;
    private retries;
    private delay;
    constructor(source: Source, baseUrl: string, o?: Options);
    protected get<T>(path: string, schema: z.ZodType<T>): Promise<T>;
}
export interface MarketPair {
    source: Source;
    chainId: string;
    dexId?: string;
    address: string;
    baseToken: {
        address: string;
        name?: string;
        symbol?: string;
    };
    quoteToken: {
        address: string;
        name?: string;
        symbol?: string;
    };
    priceUsd?: number | undefined;
    liquidityUsd?: number | undefined;
    volume24hUsd?: number | undefined;
    createdAt?: number | undefined;
    raw: unknown;
}
export declare class DexScreenerClient extends HttpClient {
    constructor(o?: Options);
    private map;
    search(q: string): Promise<MarketPair[]>;
    getPair(chain: string, address: string): Promise<MarketPair[]>;
    getTokenPairs(chain: string, address: string): Promise<MarketPair[]>;
}
export declare class GeckoTerminalClient extends HttpClient {
    constructor(o?: Options);
    private map;
    private pools;
    trendingPools(n: string): Promise<MarketPair[]>;
    newPools(n: string): Promise<MarketPair[]>;
    getPool(n: string, a: string): Promise<MarketPair[]>;
    getToken(n: string, a: string): Promise<{
        address: string;
        priceUsd: number | undefined;
        totalSupply: number | undefined;
        raw: {
            type: "token";
            id: string;
            attributes: {
                address: string;
                symbol?: string | undefined;
                name?: string | undefined;
                decimals?: number | undefined;
                total_supply?: string | number | null | undefined;
                price_usd?: string | number | null | undefined;
            } & {
                [k: string]: unknown;
            };
        };
        symbol?: string | undefined;
        name?: string | undefined;
        decimals?: number | undefined;
        total_supply?: string | number | null | undefined;
        price_usd?: string | number | null | undefined;
    }>;
    getOhlcv(n: string, p: string, period: "minute" | "hour" | "day", opts?: {
        aggregate?: number;
        limit?: number;
    }): Promise<{
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[]>;
}
export declare class BlockscoutClient extends HttpClient {
    constructor(o: Options & {
        baseUrl: string;
    });
    searchTokens(q: string): Promise<{
        source: "blockscout";
        type: string;
        address: string;
        symbol?: string | null | undefined;
        name?: string | null | undefined;
    }[]>;
    getToken(a: string): Promise<{
        decimals: number | undefined;
        totalSupply: number | undefined;
        priceUsd: number | undefined;
        holdersCount: number | undefined;
        source: "blockscout";
        address: string;
        symbol?: string | null | undefined;
        name?: string | null | undefined;
        total_supply?: string | number | null | undefined;
        exchange_rate?: string | number | null | undefined;
        holders_count?: string | number | null | undefined;
    }>;
    getTokenHolders(a: string): Promise<{
        address: string;
        balance: number | undefined;
        raw: z.objectInputType<{
            address: z.ZodObject<{
                hash: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                hash: string;
            }, {
                hash: string;
            }>;
            value: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
        }, z.ZodTypeAny, "passthrough">;
    }[]>;
    getTokenTransfers(a: string): Promise<{
        from: string | undefined;
        to: string | undefined;
        value: number | undefined;
        timestamp: string;
        transactionHash: string;
        raw: z.objectInputType<{
            from: z.ZodNullable<z.ZodObject<{
                hash: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                hash: string;
            }, {
                hash: string;
            }>>;
            to: z.ZodNullable<z.ZodObject<{
                hash: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                hash: string;
            }, {
                hash: string;
            }>>;
            total: z.ZodObject<{
                value: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
            }, "strip", z.ZodTypeAny, {
                value?: string | number | null | undefined;
            }, {
                value?: string | number | null | undefined;
            }>;
            timestamp: z.ZodString;
            transaction_hash: z.ZodString;
        }, z.ZodTypeAny, "passthrough">;
    }[]>;
}
type AggregateDeps = {
    dexscreener: {
        search(q: string): Promise<MarketPair[]>;
    };
    geckoterminal: {
        searchPools(q: string, network: string): Promise<MarketPair[]>;
    };
};
export interface AggregatedMarket extends Omit<MarketPair, "source" | "raw"> {
    sources: Source[];
    confidence: number;
    provenance: Array<{
        source: Source;
        pair: MarketPair;
    }>;
    errors: Array<{
        source: Source;
        message: string;
    }>;
}
export declare class MarketAggregator {
    private deps;
    constructor(deps: AggregateDeps);
    search(q: string, o: {
        network: string;
    }): Promise<AggregatedMarket[]>;
}
export {};
