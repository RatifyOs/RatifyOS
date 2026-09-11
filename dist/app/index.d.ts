import { type AppConfig } from "../config/index.js";
import type { ModelProvider } from "../agent/runtime/index.js";
import { AgentRuntime } from "../agent/runtime/index.js";
import { ToolRegistry } from "../agent/tools/registry.js";
import { DurableRunStore } from "../storage/run-store.js";
import { type BuiltInDependencies } from "../tools/index.js";
import { SolanaRpc } from "../chains/solana/index.js";
import { ExecutionStore, TradingOrchestrator, UnixSignerClient } from "../live-trading/index.js";
import { ApprovalEngine } from "../execution/approvals/index.js";
import { AuthorizationIssuer } from "../execution/authorization/index.js";
import { ProductionRiskEvaluator, ReservationLedger } from "../execution/control/index.js";
import { KernelStore } from "../kernel/store.js";
import type { SolanaReader, WalletProvider } from "../kernel/contracts.js";
import { PolicyController } from "../control/policy.js";
import { SignalsFeed } from "../data/index.js";
import { StrategyRunner, StrategyStore } from "../strategy/index.js";
export type DependencyHealth = {
    status: "available" | "unconfigured" | "unhealthy";
};
export interface ApplicationHealth {
    status: "ok" | "unavailable";
    readOnly: boolean;
    network: AppConfig["network"];
    dependencies: {
        sessions: DependencyHealth;
        runs: DependencyHealth;
        model: DependencyHealth & {
            provider: string;
        };
        rpc: DependencyHealth;
        simulation: DependencyHealth;
        market: DependencyHealth;
        trading: DependencyHealth;
    };
}
/**
 * What the operator console reads and writes.
 *
 * `policy` is the live handle the money path re-reads, so the console's kill
 * switch and dry-run toggle are the real ones. `kernel()` opens the kernel
 * database LAZILY — a process that never serves a dashboard never opens a
 * second SQLite handle — and returns the venue composition's store when one is
 * already open, so there is never a second writer.
 */
export interface ControlSurface {
    policy: PolicyController;
    /** base58 pubkey when custody is mounted; null in the default daemon. */
    walletAddress: string | null;
    /** Chain reads for the wallet panel; absent when custody is unmounted. */
    balances?: SolanaReader;
    kernel(): KernelStore | undefined;
    /**
     * Autonomous strategies, when a venue composition mounted them. Absent in the
     * default daemon (no custody ⇒ no runner ⇒ nothing to schedule), and the
     * console reports that rather than rendering an empty list as "none running".
     */
    strategies?: StrategyStore;
    strategyRunner?: StrategyRunner;
    /** The trade tape + rug-heat engine, when mounted. */
    signals?: SignalsFeed;
}
export interface Application {
    start(): Promise<void>;
    ready(): boolean;
    stop(): Promise<void>;
    health(): Promise<ApplicationHealth>;
    registry: ToolRegistry;
    runtime: AgentRuntime;
    runs: DurableRunStore;
    trading?: TradingOrchestrator;
    /** The operator console's view of this process. Always present. */
    control: ControlSurface;
}
export interface TradingComposition {
    trading: TradingOrchestrator;
    store: ExecutionStore;
    /** The read side of the cluster this composition was built on. */
    client: SolanaRpc;
    cluster: string;
    signer?: UnixSignerClient;
    approvals?: ApprovalEngine;
    authorization?: AuthorizationIssuer;
    reservations?: ReservationLedger;
    riskEvaluator?: ProductionRiskEvaluator;
    risk?: {
        assess(x: unknown): Promise<{
            hash: string;
            allowed: boolean;
            reasons: string[];
        }>;
    };
    verify(): Promise<void>;
    close(): void;
}
export declare function createTradingComposition(config: AppConfig, fetchFn?: typeof fetch): TradingComposition | undefined;
export declare function createApplication(config: AppConfig, overrides?: {
    modelProvider?: ModelProvider;
    tools?: BuiltInDependencies;
    rpcFetch?: typeof fetch;
    /** Transport for the configured LLM endpoint. Defaults to global fetch. */
    llmFetch?: typeof fetch;
    /**
     * Custody for the venue-backed toolsets. Omitted (the default) the perps
     * and liquidity tools are not registered at all.
     */
    wallet?: WalletProvider;
}): Application;
