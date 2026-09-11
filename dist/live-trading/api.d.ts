import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TradingOrchestrator } from "./index.js";
type Principal = {
    subject: string;
    scopes: string[];
    authenticated?: boolean;
};
export declare function registerTradingApi(app: FastifyInstance, c: {
    trading: Pick<TradingOrchestrator, "quote" | "execute" | "revoke" | "status" | "approve" | "refreshApproval" | "submit" | "recoverAndReconcile">;
    principal: (q: FastifyRequest) => Principal;
}): FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>;
export {};
