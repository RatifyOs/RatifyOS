import { type MintProvenance, type ToolContext } from "../../kernel/contracts.js";
import { type TokenAmount } from "../../kernel/money.js";
import { type PortfolioExposure } from "../exposure.js";
import type { PerpGuardContext } from "../guards.js";
import type { PerpsPolicy } from "../policy.js";
import type { PerpPosition } from "../types.js";
import type { PerpAccountRef, PerpsVenue } from "../venue.js";
/**
 * Perps tools are FACTORIES over these deps rather than module-level constants.
 *
 * `ToolContext` is per-INVOCATION state — wallet, gateway, read-only services.
 * A venue is a composition-time singleton with live policy getters hanging off
 * it, so it does not belong there: widening `ToolContext` would force every
 * construction site in the codebase to know about perps even when perps are
 * off. Closing over the venue and the policy getters gives tools that satisfy
 * `IntentToolDefinition` exactly — same `simulate`/`execute` signatures, same
 * unwidened `ToolContext` — while still reaching a venue the contract has never
 * heard of.
 *
 * Every field that can change at runtime is a GETTER, so a tool always reads the
 * live policy and arm state instead of a snapshot taken at construction. Same
 * reason `TradeGatewayImpl` takes `policy: () => PolicyConfig`.
 */
export interface PerpsToolDeps {
    readonly venue: PerpsVenue;
    readonly policy: () => PerpsPolicy;
    readonly killSwitch: () => boolean;
    readonly executionEnabled: () => boolean;
    /** The collateral asset posted as margin — the INPUT LEG every cap is denominated in. */
    readonly collateral: () => Pick<TokenAmount, "mint" | "decimals">;
    readonly subAccountId?: () => number;
    readonly priorityFeeLamports?: () => number;
    /**
     * Provenance of the collateral mint. Defaults to 'user': the collateral asset
     * is engine-configured, not something the model named. A market SYMBOL from
     * model text is still resolved against the venue's own market list, so an
     * invented market cannot survive.
     */
    readonly collateralProvenance?: () => MintProvenance;
}
export declare const DEFAULT_PERPS_PRIORITY_FEE_LAMPORTS = 200000;
export declare const DEFAULT_SLIPPAGE_BPS = 50;
export declare function accountRef(deps: PerpsToolDeps, ctx: ToolContext): PerpAccountRef;
export declare function priorityFee(deps: PerpsToolDeps): number;
export interface PerpsSnapshot {
    readonly positions: readonly PerpPosition[];
    readonly exposure: PortfolioExposure;
    readonly accountInitialized: boolean;
}
/**
 * Read everything the guards need, in one place, with EVERY failure mapped to a
 * fail-closed snapshot: an unreadable venue yields a stale exposure and an
 * uninitialised account, both of which the guards refuse to open into.
 */
export declare function readSnapshot(deps: PerpsToolDeps, account: PerpAccountRef): Promise<PerpsSnapshot>;
export declare function guardContext(deps: PerpsToolDeps, snapshot: PerpsSnapshot, market: string, dryRun: boolean): PerpGuardContext;
export declare function errMsg(err: unknown): string;
