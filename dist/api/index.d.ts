import { type FastifyInstance } from "fastify";
import { type RiskInput } from "../risk/index.js";
export interface UtilityDataSource {
    networks(): Promise<unknown[]>;
    search(q: string, network?: string): Promise<unknown[]>;
    trending(network: string): Promise<Array<Record<string, unknown>>>;
    newPairs(network: string): Promise<unknown[]>;
    token(network: string, address: string): Promise<unknown>;
    pair(network: string, address: string): Promise<unknown>;
    ohlcv(network: string, pair: string, period: string, limit?: number): Promise<unknown[]>;
    trades(network: string, pair: string, limit?: number): Promise<unknown[]>;
    holders(network: string, token: string, limit?: number): Promise<unknown[]>;
    riskInput(network: string, token: string): Promise<RiskInput>;
}
type Config = {
    source: UtilityDataSource;
    corsOrigin?: string | string[];
    timeoutMs?: number;
    rateLimit?: {
        max: number;
        windowMs: number;
    };
};
export type UtilityApi = FastifyInstance & {
    openapi: {
        openapi: string;
        info: object;
        paths: Record<string, {
            get: object;
        }>;
    };
};
export declare function createUtilityApi(c: Config): UtilityApi;
export declare function scoreTrend(x: Record<string, unknown>): number;
export {};
