import type { IntentToolDefinition } from "../../kernel/contracts.js";
import type { PerpsToolDeps } from "./deps.js";
/** Heterogeneous tool container — config types differ per tool, validated via `configSchema` at call time. */
export type AnyPerpsTool = IntentToolDefinition<any>;
export interface PerpsToolset {
    readonly all: readonly AnyPerpsTool[];
    /** The two read tools — safe to expose to the model without any confirm ceremony. */
    readonly reads: readonly AnyPerpsTool[];
    /** The three proposing tools. They build intents and stop; none of them executes. */
    readonly proposals: readonly AnyPerpsTool[];
    get(name: string): AnyPerpsTool | undefined;
}
/**
 * Build the perps toolset over a venue.
 *
 * A factory rather than a module-level constant because the tools need a venue
 * and a live policy getter, and `ToolContext` — which is per-invocation state —
 * carries neither. See `tools/deps.ts` for why that split is the right one.
 */
export declare function createPerpsTools(deps: PerpsToolDeps): PerpsToolset;
export declare const PERPS_TOOL_NAMES: readonly ["perps_markets", "perps_positions", "perps_open", "perps_close", "perps_adjust"];
export type PerpsToolName = (typeof PERPS_TOOL_NAMES)[number];
