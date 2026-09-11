import { z } from "zod";
import type { IntentToolDefinition } from "../../kernel/contracts.js";
import { type PerpsToolDeps } from "./deps.js";
declare const configSchema: z.ZodObject<{
    /** Filter to markets whose symbol contains this fragment, e.g. 'SOL'. */
    filter: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    /** Fetch mark/oracle price + funding per market. Costs one venue round-trip each. */
    withPrices: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filter?: string | undefined;
    limit?: number | undefined;
    withPrices?: boolean | undefined;
}, {
    filter?: string | undefined;
    limit?: number | undefined;
    withPrices?: boolean | undefined;
}>;
export type PerpsMarketsConfig = z.infer<typeof configSchema>;
/** List the venue's perp markets with their margin parameters. Read-only — never builds an intent. */
export declare function makePerpsMarketsTool(deps: PerpsToolDeps): IntentToolDefinition<PerpsMarketsConfig>;
export {};
