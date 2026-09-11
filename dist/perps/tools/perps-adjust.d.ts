import { z } from "zod";
import { type IntentToolDefinition } from "../../kernel/contracts.js";
import { type PerpsToolDeps } from "./deps.js";
declare const configSchema: z.ZodEffects<z.ZodObject<{
    market: z.ZodString;
    direction: z.ZodEnum<["increase", "reduce"]>;
    /** Base-asset size to add or remove, in UI units (e.g. 0.5 SOL of SOL-PERP). */
    baseUi: z.ZodNumber;
    /** Additional margin for an increase. Required when increasing, ignored when reducing. */
    collateralUi: z.ZodOptional<z.ZodNumber>;
    leverage: z.ZodOptional<z.ZodNumber>;
    orderType: z.ZodOptional<z.ZodEnum<["market", "limit"]>>;
    limitPrice: z.ZodOptional<z.ZodNumber>;
    slippageBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    market: string;
    direction: "reduce" | "increase";
    baseUi: number;
    leverage?: number | undefined;
    orderType?: "market" | "limit" | undefined;
    collateralUi?: number | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
}, {
    market: string;
    direction: "reduce" | "increase";
    baseUi: number;
    leverage?: number | undefined;
    orderType?: "market" | "limit" | undefined;
    collateralUi?: number | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
}>, {
    market: string;
    direction: "reduce" | "increase";
    baseUi: number;
    leverage?: number | undefined;
    orderType?: "market" | "limit" | undefined;
    collateralUi?: number | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
}, {
    market: string;
    direction: "reduce" | "increase";
    baseUi: number;
    leverage?: number | undefined;
    orderType?: "market" | "limit" | undefined;
    collateralUi?: number | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
}>;
export type PerpsAdjustConfig = z.infer<typeof configSchema>;
/**
 * Increase or reduce an existing perp position by a base-size delta. An increase
 * carries the full opening guard set (leverage, caps, liquidation distance,
 * funding); a reduce carries only the reduction-consistency guards, so getting
 * smaller is never blocked by an entry-quality rule. Builds an intent; never executes.
 */
export declare function makePerpsAdjustTool(deps: PerpsToolDeps): IntentToolDefinition<PerpsAdjustConfig>;
export {};
