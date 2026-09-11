import { z } from "zod";
import { type IntentToolDefinition } from "../../kernel/contracts.js";
import { type PerpsToolDeps } from "./deps.js";
declare const configSchema: z.ZodObject<{
    market: z.ZodString;
    side: z.ZodEnum<["long", "short"]>;
    /** Margin to post, in UI units of the collateral asset. THE INPUT LEG. */
    collateralUi: z.ZodNumber;
    leverage: z.ZodNumber;
    orderType: z.ZodOptional<z.ZodEnum<["market", "limit"]>>;
    limitPrice: z.ZodOptional<z.ZodNumber>;
    slippageBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    market: string;
    side: "long" | "short";
    leverage: number;
    collateralUi: number;
    orderType?: "market" | "limit" | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
}, {
    market: string;
    side: "long" | "short";
    leverage: number;
    collateralUi: number;
    orderType?: "market" | "limit" | undefined;
    limitPrice?: number | undefined;
    slippageBps?: number | undefined;
}>;
export type PerpsOpenConfig = z.infer<typeof configSchema>;
/**
 * Open a new perp position. Builds an intent and returns it — never signs,
 * never broadcasts, never touches a keypair.
 *
 * Declares `sign`/`spend` even though it executes nothing: the artifact it
 * produces would move value, so it must be classified with the same ceremony as
 * `swap_jupiter`. Under-declaring capabilities is the dangerous direction.
 */
export declare function makePerpsOpenTool(deps: PerpsToolDeps): IntentToolDefinition<PerpsOpenConfig>;
export {};
