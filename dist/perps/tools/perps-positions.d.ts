import { z } from "zod";
import { type IntentToolDefinition } from "../../kernel/contracts.js";
import { type PerpsToolDeps } from "./deps.js";
declare const configSchema: z.ZodObject<{
    market: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    market?: string | undefined;
}, {
    market?: string | undefined;
}>;
export type PerpsPositionsConfig = z.infer<typeof configSchema>;
/** List open perp positions with liquidation distance and portfolio-cap usage. Read-only. */
export declare function makePerpsPositionsTool(deps: PerpsToolDeps): IntentToolDefinition<PerpsPositionsConfig>;
export {};
