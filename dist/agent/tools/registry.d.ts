import type { Capability, InvocationContext, ToolAuditEvent, ToolDefinition, ToolResult } from "../types.js";
export interface RegistryOptions {
    audit?: (event: ToolAuditEvent) => void | Promise<void>;
    defaultTimeoutMs?: number;
}
export interface ToolFilter {
    toolset?: string;
    capabilities?: readonly Capability[];
}
type ModelSchema = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
};
export declare class ToolRegistry {
    #private;
    constructor(options?: RegistryOptions);
    register<I, O>(tool: ToolDefinition<I, O>): this;
    defineToolset(name: string, tools: readonly string[]): this;
    list(filter?: ToolFilter): ToolDefinition[];
    listPrivileged(filter?: Omit<ToolFilter, "capabilities">): ToolDefinition[];
    available(filter?: ToolFilter): Promise<ToolDefinition[]>;
    schemas(filter?: ToolFilter): ModelSchema[];
    schemasPrivileged(filter?: Omit<ToolFilter, "capabilities">): ModelSchema[];
    classify(name: string): {
        effect: import("../types.js").ToolEffect;
        parallelSafe: boolean;
    };
    invoke(name: string, input: unknown, context: InvocationContext): Promise<ToolResult>;
    invokeParallel(calls: readonly {
        name: string;
        input: unknown;
    }[], context: InvocationContext): Promise<ToolResult[]>;
}
export {};
