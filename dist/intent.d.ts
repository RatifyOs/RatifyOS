import { z } from "zod";
declare const swapIntentSchema: z.ZodObject<{
    kind: z.ZodLiteral<"swap">;
    tokenIn: z.ZodEffects<z.ZodString, string, string>;
    tokenOut: z.ZodEffects<z.ZodString, string, string>;
    amountIn: z.ZodEffects<z.ZodString, bigint, string>;
    maxSlippageBps: z.ZodNumber;
    expiresAt: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    kind: "swap";
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    maxSlippageBps: number;
    expiresAt: number;
}, {
    kind: "swap";
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    maxSlippageBps: number;
    expiresAt: number;
}>;
export type SwapIntent = z.infer<typeof swapIntentSchema>;
/**
 * The typed boundary an untrusted planner has to come through.
 *
 * `.strict()` is the whole point: an intent carries a mint pair, an amount, a
 * slippage bound and an expiry, and nothing else. A model cannot append raw
 * instruction data, an extra account, or a program id, because an unknown field
 * is a parse failure rather than a passthrough.
 */
export declare function normalizeIntent(input: unknown): SwapIntent;
export {};
