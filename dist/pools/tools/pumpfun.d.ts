import { z } from "zod";
import { type IntentToolDefinition } from "../../kernel/contracts.js";
import { type PoolsDeps } from "./deps.js";
/**
 * Direct bonding-curve trading for pre-migration pump.fun tokens.
 *
 * Aggregators cannot route a live curve, so these build the curve instructions
 * themselves. The moment a curve **completes**, the opposite is true — the token
 * is a normal AMM asset and Jupiter is strictly better — so these tools detect
 * that and *delegate* rather than compete: the result carries a `delegateTo`
 * payload naming `swap_jupiter` and the exact config to call it with. This
 * package never re-implements routing that already exists.
 */
export interface DelegationPayload {
    readonly delegateTo: "swap_jupiter";
    readonly reason: string;
    readonly config: {
        readonly inputMint: string;
        readonly outputMint: string;
        readonly amountUi: number;
        readonly slippageBps: number | undefined;
    };
}
declare const curveSchema: z.ZodObject<{
    mint: z.ZodString;
}, "strip", z.ZodTypeAny, {
    mint: string;
}, {
    mint: string;
}>;
type CurveConfig = z.infer<typeof curveSchema>;
export declare function makePumpfunCurveTool(deps: PoolsDeps): IntentToolDefinition<CurveConfig>;
declare const buySchema: z.ZodObject<{
    mint: z.ZodString;
    /** SOL to spend, all-in (curve cost + fee). */
    amountUi: z.ZodNumber;
    slippageBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mint: string;
    amountUi: number;
    slippageBps?: number | undefined;
}, {
    mint: string;
    amountUi: number;
    slippageBps?: number | undefined;
}>;
type BuyConfig = z.infer<typeof buySchema>;
export declare function makePumpfunBuyTool(deps: PoolsDeps): IntentToolDefinition<BuyConfig>;
declare const sellSchema: z.ZodEffects<z.ZodObject<{
    mint: z.ZodString;
    /** Token amount to sell. Mutually exclusive with `percent`. */
    amountUi: z.ZodOptional<z.ZodNumber>;
    /** Percentage of the wallet's holding to sell (1..100). */
    percent: z.ZodOptional<z.ZodNumber>;
    slippageBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mint: string;
    slippageBps?: number | undefined;
    amountUi?: number | undefined;
    percent?: number | undefined;
}, {
    mint: string;
    slippageBps?: number | undefined;
    amountUi?: number | undefined;
    percent?: number | undefined;
}>, {
    mint: string;
    slippageBps?: number | undefined;
    amountUi?: number | undefined;
    percent?: number | undefined;
}, {
    mint: string;
    slippageBps?: number | undefined;
    amountUi?: number | undefined;
    percent?: number | undefined;
}>;
type SellConfig = z.infer<typeof sellSchema>;
export declare function makePumpfunSellTool(deps: PoolsDeps): IntentToolDefinition<SellConfig>;
export {};
