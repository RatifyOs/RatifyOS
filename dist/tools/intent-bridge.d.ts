import type { ToolRegistry } from "../agent/tools/registry.js";
import type { IntentToolDefinition, ToolContext } from "../kernel/contracts.js";
export interface IntentToolRuntime {
    /** Per-invocation context: wallet, gateway, read-only services. */
    context(): ToolContext | Promise<ToolContext>;
    /**
     * True iff a human has confirmed this specific invocation. Defaults to false
     * — an unwired approvals path means untrusted-provenance mints are refused,
     * not waved through.
     */
    confirmedByUser?: (toolName: string, config: unknown) => boolean | Promise<boolean>;
    /** Override only in tests; production wants a fresh server-generated key. */
    idempotencyKey?: () => string;
}
/**
 * Register one intent tool (and its preview surface, if it moves value).
 * Returns the registry so calls chain like the built-in registrations do.
 */
export declare function registerIntentTool(registry: ToolRegistry, tool: IntentToolDefinition<unknown>, runtime: IntentToolRuntime): ToolRegistry;
export declare function registerIntentTools(registry: ToolRegistry, tools: readonly IntentToolDefinition<any>[], runtime: IntentToolRuntime): ToolRegistry;
