import { ToolRegistry } from "../agent/tools/registry.js";
import type { VenueMounts } from "./venues.js";
type MarketDeps = {
    networks?: () => Promise<unknown>;
    search?: (q: string, n?: string) => Promise<unknown>;
    trending?: (n: string) => Promise<unknown>;
    newPairs?: (n: string) => Promise<unknown>;
    token?: (n: string, a: string) => Promise<unknown>;
    pair?: (n: string, a: string) => Promise<unknown>;
    ohlcv?: (n: string, p: string, x: string, l?: number) => Promise<unknown>;
    trades?: (n: string, p: string, l?: number) => Promise<unknown>;
    holders?: (n: string, t: string, l?: number) => Promise<unknown>;
};
export interface BuiltInDependencies {
    market?: MarketDeps;
    risk?: {
        analyze?: (input: unknown) => unknown;
    };
    simulation?: {
        simulate?: (input: any) => Promise<unknown>;
    };
    /**
     * Perps and liquidity venues. Omitted, those tools simply do not exist —
     * which is the correct default: an unmounted venue must not be reachable.
     * See `src/tools/venues.ts`, and note that mounting perps also requires
     * handing `perpsPositionReader(...)` to the trade gateway.
     */
    venues?: VenueMounts;
}
export declare function registerBuiltInTools(r: ToolRegistry, d?: BuiltInDependencies): ToolRegistry;
export { registerIntentTool, registerIntentTools } from "./intent-bridge.js";
export type { IntentToolRuntime } from "./intent-bridge.js";
export { perpsPositionReader, registerVenueTools, venueToolNames, } from "./venues.js";
export type { VenueMounts } from "./venues.js";
