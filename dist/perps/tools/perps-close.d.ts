import { z } from "zod";
import type { IntentToolDefinition } from "../../kernel/contracts.js";
import { type PerpsToolDeps } from "./deps.js";
declare const configSchema: z.ZodObject<{
    market: z.ZodString;
    /** 10000 = fully close. Defaults to a full close. */
    fractionBps: z.ZodOptional<z.ZodNumber>;
    orderType: z.ZodOptional<z.ZodEnum<["market", "limit"]>>;
    limitPrice: z.ZodOptional<z.ZodNumber>;
    slippageBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    market: string;
    orderType?: "market" | "limit" | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
    fractionBps?: number | undefined;
}, {
    market: string;
    orderType?: "market" | "limit" | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
    fractionBps?: number | undefined;
}>;
export type PerpsCloseConfig = z.infer<typeof configSchema>;
/**
 * Close (or partially close) a perp position. Reduce-only by construction, so
 * it survives wind-down mode — the agent must always be able to propose getting
 * flat. Builds an intent and returns it; never executes.
 */
export declare function makePerpsCloseTool(deps: PerpsToolDeps): IntentToolDefinition<PerpsCloseConfig>;
export {};
