import type { RugHeat, RugHeatSource } from "../signals.js";
import type { ChainReader } from "../chain.js";
import type { PoolGuardConfig } from "../guards.js";
import type { PumpFunClient } from "../pumpfun/client.js";
import { type RebalancePolicy } from "../rebalance/decide.js";
import { RebalanceLedger } from "../rebalance/ledger.js";
import type { AmmVenue } from "../types.js";
/**
 * What the pools tools need beyond the standard `ToolContext`.
 *
 * These are composition-time singletons — a venue, a guard config, a rebalance
 * ledger, live policy getters — not per-invocation state, so they do NOT belong
 * on `ToolContext`. The tools are therefore **factories** closed over these
 * deps: `makePoolsTools(deps)` hands back `IntentToolDefinition` objects that
 * satisfy the shared contract exactly, with the same `simulate`/`execute`
 * signatures and the same unwidened `ToolContext`. The wiring cost is one call
 * in the composition root.
 */
export type { RugHeatSource } from "../signals.js";
export interface PoolsDeps {
    readonly venue: AmmVenue;
    readonly curve: PumpFunClient;
    readonly chain: ChainReader;
    readonly guards: PoolGuardConfig;
    readonly rebalancePolicy: RebalancePolicy;
    readonly ledger: RebalanceLedger;
    /**
     * Live rug-heat, from a signals engine (see `signals.ts`). Omitting it does not
     * make the tools permissive — `guardRugHeat` refuses on a missing reading, so an
     * unwired signals engine means no buys, not unchecked buys.
     */
    readonly signals?: RugHeatSource | undefined;
    /**
     * Ask the PumpPortal watcher to start following a mint. The tape starts empty, so
     * a never-seen mint scores 60/100 ("no trades in window") and is refused; calling
     * this on the read path warms it for the next attempt.
     */
    readonly watch?: (mint: string) => void;
    readonly now?: () => number;
    /** Baseline tip. The kernel re-caps the built fee against policy regardless. */
    readonly priorityFeeLamports?: number;
}
export declare const DEFAULT_PRIORITY_FEE_LAMPORTS = 200000;
export interface PoolsDepsInput extends Omit<PoolsDeps, "guards" | "rebalancePolicy" | "ledger"> {
    readonly guards?: PoolGuardConfig;
    readonly rebalancePolicy?: RebalancePolicy;
    readonly ledger?: RebalanceLedger;
}
export declare function resolveDeps(input: PoolsDepsInput): PoolsDeps;
/** Rug-heat for a mint, or null when no signals engine is wired (⇒ a refusal upstream). */
export declare function readRugHeat(deps: PoolsDeps, mint: string): RugHeat | null;
