#!/usr/bin/env node
import Fastify, { type FastifyInstance } from "fastify";
import { type AppConfig } from "./config/index.js";
import type { ModelProvider } from "./agent/runtime/index.js";
export interface ServerOptions {
    ready: () => boolean | Promise<boolean>;
    health: () => unknown | Promise<unknown>;
    version?: string;
    build?: string;
    signing?: boolean;
    apiToken?: string;
    resources?: {
        sessions?: () => unknown | Promise<unknown>;
    };
}
export declare function createServer(o: ServerOptions): FastifyInstance;
export declare function createStandaloneServer(config: AppConfig, overrides?: {
    rpcFetch?: typeof fetch;
    modelProvider?: ModelProvider;
}): Promise<Fastify.FastifyInstance<Fastify.RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, Fastify.FastifyBaseLogger, Fastify.FastifyTypeProviderDefault>>;
export declare function main(): Promise<void>;
