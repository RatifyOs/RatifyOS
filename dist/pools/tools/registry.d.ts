import type { IntentToolDefinition } from "../../kernel/contracts.js";
import { type PoolsDeps, type PoolsDepsInput } from "./deps.js";
/** Heterogeneous container — config types differ per tool, validated via `configSchema` at call time. */
export type AnyPoolTool = IntentToolDefinition<any>;
export interface PoolsToolset {
    readonly deps: PoolsDeps;
    readonly tools: readonly AnyPoolTool[];
    get(name: string): AnyPoolTool | undefined;
}
/**
 * Build the eight pool/curve tools against one set of dependencies.
 *
 * Read tools first, then the intent builders, so a registry that concatenates
 * the two lists keeps reads ahead of spends in the LLM's tool listing.
 */
export declare function makePoolsTools(input: PoolsDepsInput): PoolsToolset;
/** Names this package contributes, for wiring checks and prompt budgeting. */
export declare const POOL_TOOL_NAMES: readonly ["pools_list", "pools_position", "pumpfun_curve", "pools_open", "pools_rebalance", "pools_close", "pumpfun_buy", "pumpfun_sell"];
