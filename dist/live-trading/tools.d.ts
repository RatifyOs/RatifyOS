import type { ToolRegistry } from "../agent/tools/registry.js";
import type { TradingOrchestrator } from "./index.js";
export declare function registerTradingTools(r: ToolRegistry, trading: Pick<TradingOrchestrator, "quote" | "execute" | "status">): ToolRegistry;
