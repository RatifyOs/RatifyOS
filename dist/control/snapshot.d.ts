/**
 * Projects the daemon's real runtime into one {@link DashboardSnapshot}.
 *
 * The rule this module is written to: **never invent a number**. Where a source
 * exists in this repo it is read; where one does not, the field carries an
 * explicit empty/unavailable value and {@link SnapshotSources} says so on the
 * wire, so an operator can tell "nothing is happening" apart from "nothing is
 * wired". A console that quietly renders zeros for data it cannot see is worse
 * than one that renders nothing.
 *
 * Backed by real runtime state today:
 *   · system policy      — the live `PolicyConfig` the TradeGateway re-reads
 *   · caps               — `SpendCaps` + `KernelStore.usage()` per bucket
 *   · activity           — the kernel journal (`KernelStore.recentJournal`)
 *   · inflight           — kernel trades still in `reserved` / `sent`
 *   · wallet / spot      — `SolanaReader.getTokenHoldings`, when custody is
 *                          mounted (the default daemon mounts none)
 *   · strategies         — `StrategyStore`, when a venue composition mounted a
 *                          runner. Absent without custody, and reported absent
 *                          rather than shown as an empty list.
 *   · signals            — the PumpPortal trade tape + rug-heat engine, on the
 *                          same condition. `connected` is the live socket
 *                          state, so a silent feed reads as disconnected rather
 *                          than as a market with no trades in it.
 *
 * Explicitly unavailable, because no source exists in this repo yet:
 *   · approvals          — the kernel has NO pending-approval queue.
 *                          `TradeGatewayImpl` takes `confirmedByUser` per call
 *                          and the composition leaves it unwired, so there is
 *                          nothing to queue and nothing to decide.
 *   · perp / DLMM legs   — `PerpsVenue.getPositions` exists but needs the
 *                          optional Drift SDK peer and live RPC; no lister is
 *                          mounted for the console.
 *   · USD valuation      — there is no price oracle in this repo. Every `usd`
 *                          field is 0 and `SnapshotSources.valuation` is false.
 *   · block height/slot  — no chain-height port is mounted, so blockhash
 *                          headroom is reported as 0 rather than guessed.
 */
import type { SolanaReader } from "../kernel/contracts.js";
import type { KernelStore } from "../kernel/store.js";
import type { SignalsFeed } from "../data/index.js";
import type { StrategyStore } from "../strategy/index.js";
import type { PolicyController } from "./policy.js";
import type { DashboardSnapshot } from "./view.js";
/** Which panels of a snapshot are backed by a real source in this build. */
export interface SnapshotSources {
    readonly kernel: boolean;
    readonly wallet: boolean;
    readonly valuation: boolean;
    readonly approvals: boolean;
    readonly strategies: boolean;
    readonly signals: boolean;
    readonly perps: boolean;
    readonly dlmm: boolean;
    readonly chainHeight: boolean;
}
export interface ControlRuntime {
    readonly network: string;
    readonly rpcLabel: string;
    readonly modelLabel: string;
    readonly bootedAt: number;
    /** base58 pubkey of the mounted wallet, or null when custody is unmounted. */
    readonly walletAddress: string | null;
    readonly policy: PolicyController;
    /** The kernel store, opened on demand. Undefined when it cannot be opened. */
    kernel(): KernelStore | undefined;
    /** Read-side chain view, when custody mounts one. */
    balances?: SolanaReader | undefined;
    /** Autonomous strategies, when a runner is mounted. */
    strategies?: StrategyStore | undefined;
    /** The trade tape + rug-heat engine, when a feed is mounted. */
    signals?: SignalsFeed | undefined;
    now?: () => number;
}
/** How far back the console's signals panel looks. Matches the engine default. */
export declare const SIGNALS_WINDOW_MS = 300000;
export declare function snapshotSources(runtime: ControlRuntime): SnapshotSources;
export declare function buildSnapshot(runtime: ControlRuntime): Promise<DashboardSnapshot>;
