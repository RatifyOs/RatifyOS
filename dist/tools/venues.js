import { createPerpsTools, PERPS_TOOL_NAMES } from "../perps/index.js";
import { positionReaderOver } from "../perps/settle.js";
import { makePoolsTools, POOL_TOOL_NAMES } from "../pools/index.js";
import { registerIntentTools } from "./intent-bridge.js";
/**
 * The {@link PositionReader} the trade gateway needs to verify a perp fill.
 *
 * This is not optional wiring. The gateway refuses a perp intent when no reader
 * is mounted (`SETTLE_UNVERIFIABLE`), because a perp fill cannot be read off a
 * token balance — so mounting the perps tools without also handing this to
 * `TradeGatewayImpl` yields tools that build intents the kernel will not
 * execute. Returns `undefined` when perps are not mounted at all.
 */
export function perpsPositionReader(mounts) {
    return mounts.perps ? positionReaderOver([mounts.perps.venue]) : undefined;
}
/** Every tool name the venue mounts contribute, for wiring checks and prompt budgeting. */
export function venueToolNames(mounts) {
    return [
        ...(mounts.perps ? PERPS_TOOL_NAMES : []),
        ...(mounts.pools ? POOL_TOOL_NAMES : []),
    ];
}
/**
 * Register the perps and pools toolsets on `registry`. Reads land before spends
 * so the model's tool listing shows the safe surface first.
 */
export function registerVenueTools(registry, mounts) {
    if (mounts.perps) {
        const toolset = createPerpsTools(mounts.perps);
        registerIntentTools(registry, toolset.reads, mounts.runtime);
        registerIntentTools(registry, toolset.proposals, mounts.runtime);
    }
    if (mounts.pools) {
        registerIntentTools(registry, makePoolsTools(mounts.pools).tools, mounts.runtime);
    }
    return registry;
}
