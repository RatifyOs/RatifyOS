import { ModelRouter } from "../agent/models/index.js";
import type { ModelProvider, ModelRequest, ToolCall, ToolDispatcher, ToolDispatchResult } from "../agent/runtime/index.js";
import type { Capability } from "../agent/types.js";
import { ToolRegistry } from "../agent/tools/registry.js";
import type { LlmConfig } from "../config/index.js";
export declare class RegistryDispatcher implements ToolDispatcher {
    private registry;
    private capabilities;
    constructor(registry: ToolRegistry, capabilities: readonly Capability[]);
    classify(name: string): {
        effect: "read";
    } | {
        effect: "proposal";
    } | {
        effect: "write";
    };
    dispatch(call: ToolCall, ctx: {
        signal: AbortSignal;
    }): Promise<ToolDispatchResult>;
}
export declare class ModelRouterProvider implements ModelProvider {
    private router;
    private registry;
    private options;
    readonly id: string;
    constructor(router: Pick<ModelRouter, "complete">, registry: ToolRegistry, options: {
        capabilities: readonly Capability[];
        /**
         * What health and the operator console call this planner. Defaults to the
         * generic router name; a provider built from configuration names the
         * endpoint instead, so "which model is actually answering" is a readable
         * fact rather than an inference.
         */
        id?: string;
        /**
         * Ceiling on a single completion. Worth setting for a small self-hosted
         * model, where an unbounded reply is how a 4096-token window is spent on
         * one answer.
         */
        maxOutputTokens?: number;
    });
    complete(request: ModelRequest, signal: AbortSignal): Promise<{
        message: {
            toolCalls?: import("../agent/models/index.js").ModelToolCall[];
            role: "assistant";
            content: string;
        };
        usage: {
            inputTokens: number;
            outputTokens: number;
        };
    }>;
}
/** How a configured endpoint is named in health, routing and the console. */
export declare function llmProviderId(llm: LlmConfig): string;
/**
 * Build the agent's model provider from configuration.
 *
 * One endpoint becomes one {@link ModelCandidate}, so the router's existing
 * behaviour is preserved rather than bypassed: the context/output check, the
 * cost ordering, the rate-limit health tracker and the fallback loop all still
 * run — over a list of one, which is what a self-hosted deployment has.
 *
 * The API key never leaves its {@link import("../kernel/secret.js").Secret}
 * except inside `resolve()`, which the transport calls per request and whose
 * result it puts straight into an `Authorization` header. Nothing here holds
 * the revealed string. When there is no key — the keyless local server — no
 * credential is passed and the transport sends no `Authorization` header at
 * all, rather than an empty bearer token a server could reject.
 *
 * `supportedTools` is the registry's tool set at composition time, which is
 * when every built-in, trading and venue tool has been registered. An
 * OpenAI-compatible endpoint with function calling supports whatever schema it
 * is handed, so this is a completeness statement about the registry rather
 * than a claim about the model — the router has no way to say "all". A tool
 * registered after composition is therefore outside the snapshot and routing
 * refuses the turn by name, which is visible rather than silently offering the
 * model a tool this candidate never declared.
 */
export declare function createModelProvider(llm: LlmConfig, registry: ToolRegistry, options: {
    capabilities: readonly Capability[];
    fetch?: typeof globalThis.fetch;
}): ModelProvider;
