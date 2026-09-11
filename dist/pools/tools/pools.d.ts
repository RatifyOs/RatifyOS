import { z } from "zod";
import { type IntentToolDefinition } from "../../kernel/contracts.js";
import { type PoolsDeps } from "./deps.js";
/**
 * Agent-facing liquidity tools.
 *
 * They follow the same contract as `swap_jupiter`: `simulate()` returns a real
 * preview plus the exact intent the kernel would receive, and `execute()` hands
 * that intent to `ctx.gateway.execute()` and nothing else. No tool in this file
 * signs, broadcasts, or holds key material — the LLM's reachable surface ends at
 * "here is a structured intent".
 */
declare const listSchema: z.ZodObject<{
    mint: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    mint: string;
    limit?: number | undefined;
}, {
    mint: string;
    limit?: number | undefined;
}>;
type ListConfig = z.infer<typeof listSchema>;
export declare function makePoolsListTool(deps: PoolsDeps): IntentToolDefinition<ListConfig>;
declare const positionSchema: z.ZodObject<{
    poolAddress: z.ZodOptional<z.ZodString>;
    positionAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    positionAddress?: string | undefined;
    poolAddress?: string | undefined;
}, {
    positionAddress?: string | undefined;
    poolAddress?: string | undefined;
}>;
type PositionConfig = z.infer<typeof positionSchema>;
export declare function makePoolsPositionTool(deps: PoolsDeps): IntentToolDefinition<PositionConfig>;
declare const openSchema: z.ZodObject<{
    poolAddress: z.ZodString;
    /** Quote asset (SOL/USDC) to deposit — the leg the kernel caps. */
    quoteAmountUi: z.ZodNumber;
    /** Optional base-asset leg for a two-sided deposit. */
    baseAmountUi: z.ZodOptional<z.ZodNumber>;
    belowBins: z.ZodOptional<z.ZodNumber>;
    aboveBins: z.ZodOptional<z.ZodNumber>;
    shape: z.ZodOptional<z.ZodEnum<["spot", "curve", "bid-ask"]>>;
    /** Add to an existing position instead of opening a new one. */
    positionAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    poolAddress: string;
    quoteAmountUi: number;
    shape?: "spot" | "curve" | "bid-ask" | undefined;
    positionAddress?: string | undefined;
    baseAmountUi?: number | undefined;
    belowBins?: number | undefined;
    aboveBins?: number | undefined;
}, {
    poolAddress: string;
    quoteAmountUi: number;
    shape?: "spot" | "curve" | "bid-ask" | undefined;
    positionAddress?: string | undefined;
    baseAmountUi?: number | undefined;
    belowBins?: number | undefined;
    aboveBins?: number | undefined;
}>;
type OpenConfig = z.infer<typeof openSchema>;
export declare function makePoolsOpenTool(deps: PoolsDeps): IntentToolDefinition<OpenConfig>;
declare const closeSchema: z.ZodObject<{
    poolAddress: z.ZodString;
    positionAddress: z.ZodString;
    /** 1..10000. Defaults to the whole position. */
    bpsToRemove: z.ZodOptional<z.ZodNumber>;
    claimFees: z.ZodOptional<z.ZodBoolean>;
    /** Close the emptied position account and reclaim its rent. Only valid at 100%. */
    closePosition: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    positionAddress: string;
    poolAddress: string;
    bpsToRemove?: number | undefined;
    claimFees?: boolean | undefined;
    closePosition?: boolean | undefined;
}, {
    positionAddress: string;
    poolAddress: string;
    bpsToRemove?: number | undefined;
    claimFees?: boolean | undefined;
    closePosition?: boolean | undefined;
}>;
type CloseConfig = z.infer<typeof closeSchema>;
export declare function makePoolsCloseTool(deps: PoolsDeps): IntentToolDefinition<CloseConfig>;
declare const rebalanceSchema: z.ZodObject<{
    poolAddress: z.ZodString;
    positionAddress: z.ZodString;
    /** Report the decision without building the exit intent. */
    dryRun: z.ZodOptional<z.ZodBoolean>;
    /** UI price the position was opened at, for the divergence-loss term. */
    entryPrice: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    positionAddress: string;
    poolAddress: string;
    entryPrice?: number | undefined;
    dryRun?: boolean | undefined;
}, {
    positionAddress: string;
    poolAddress: string;
    entryPrice?: number | undefined;
    dryRun?: boolean | undefined;
}>;
type RebalanceConfig = z.infer<typeof rebalanceSchema>;
export declare function makePoolsRebalanceTool(deps: PoolsDeps): IntentToolDefinition<RebalanceConfig>;
export {};
