export type ToolEffect = "read" | "proposal" | "write";
export interface ToolCall {
    id: string;
    name: string;
    arguments: unknown;
}
export type AgentMessage = {
    role: "system" | "user";
    content: string;
} | {
    role: "assistant";
    content: string;
    toolCalls?: readonly ToolCall[];
} | {
    role: "tool";
    content: string;
    toolCallId: string;
    name: string;
};
export interface ModelResponse {
    message: Extract<AgentMessage, {
        role: "assistant";
    }>;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        costUsd?: number;
    };
}
export interface ModelRequest {
    messages: readonly AgentMessage[];
}
export interface ModelProvider {
    id: string;
    complete(request: ModelRequest, signal: AbortSignal): Promise<ModelResponse>;
}
export interface ToolDispatchResult {
    ok: boolean;
    toolCallId: string;
    name: string;
    data?: unknown;
    error?: unknown;
}
export interface ToolDispatcher {
    classify(name: string): {
        effect: ToolEffect;
    };
    dispatch(call: ToolCall, context: {
        signal: AbortSignal;
    }): Promise<ToolDispatchResult>;
}
export type RuntimeErrorCode = "ITERATION_BUDGET_EXCEEDED" | "TOOL_BUDGET_EXCEEDED" | "LOOP_DETECTED" | "DEADLINE_EXCEEDED" | "MODEL_ERROR" | "UNSAFE_TOOL" | "NO_TOOL_DISPATCHER" | "RECONCILIATION_REQUIRED";
export declare class AgentRuntimeError extends Error {
    readonly code: RuntimeErrorCode;
    readonly cause?: unknown | undefined;
    constructor(code: RuntimeErrorCode, message: string, cause?: unknown | undefined);
}
interface BaseEvent {
    timestamp: number;
}
export type AgentEvent = (BaseEvent & {
    type: "run.started";
}) | (BaseEvent & {
    type: "iteration.started";
    iteration: number;
}) | (BaseEvent & {
    type: "model.requested";
    provider: string;
    iteration: number;
}) | (BaseEvent & {
    type: "provider.failed";
    provider: string;
    error: string;
}) | (BaseEvent & {
    type: "model.responded";
    provider: string;
    response: ModelResponse;
}) | (BaseEvent & {
    type: "tool.started";
    call: ToolCall;
}) | (BaseEvent & {
    type: "tool.completed";
    call: ToolCall;
    result: ToolDispatchResult;
}) | (BaseEvent & {
    type: "run.completed";
    message: Extract<AgentMessage, {
        role: "assistant";
    }>;
    iterations: number;
    toolCalls: number;
}) | (BaseEvent & {
    type: "run.failed";
    error: {
        code: RuntimeErrorCode;
        message: string;
    };
}) | (BaseEvent & {
    type: "run.cancelled";
    reason?: unknown;
});
export interface RuntimeOptions {
    providers: readonly ModelProvider[];
    tools?: ToolDispatcher;
    maxIterations?: number;
    maxToolCalls?: number;
    maxRepeatedToolCalls?: number;
    persistMessage?: (message: AgentMessage) => void | Promise<void>;
    persistToolLifecycle?: (record: {
        status: "planned" | "started" | "succeeded" | "failed" | "reconciliation-required";
        call: ToolCall;
        result?: ToolDispatchResult;
        error?: unknown;
    }) => void | Promise<void>;
}
export interface RunInput {
    messages: readonly AgentMessage[];
    signal?: AbortSignal;
    deadline?: number;
}
export declare class AgentRuntime {
    #private;
    constructor(options: RuntimeOptions);
    run(input: RunInput): AsyncGenerator<AgentEvent>;
}
export {};
