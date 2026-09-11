export type MessageRole = "system" | "user" | "assistant" | "tool";
export interface ModelToolCall {
    id: string;
    name: string;
    arguments: unknown;
}
export interface ModelMessage {
    role: MessageRole;
    content: string;
    name?: string;
    toolCallId?: string;
    toolCalls?: readonly ModelToolCall[];
}
export interface ModelTool {
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
}
export interface ModelRequest {
    messages: readonly ModelMessage[];
    model?: string;
    tools?: readonly ModelTool[];
    requiredTools?: readonly string[];
    contextTokens?: number;
    maxOutputTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
}
export interface ModelUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}
export interface ModelResponse {
    id: string;
    provider: string;
    model: string;
    content: string;
    toolCalls: ModelToolCall[];
    finishReason: string;
    usage: ModelUsage;
}
export interface ModelTransport {
    complete(request: ModelRequest): Promise<ModelResponse>;
}
export interface CredentialReference {
    readonly id: string;
    resolve(): Promise<string>;
}
export interface ModelCandidate {
    id: string;
    provider: string;
    model: string;
    transport: string;
    contextWindow: number;
    supportedTools: readonly string[];
    inputCostPerMillion: number;
    outputCostPerMillion: number;
}
export declare class RateLimitHealthTracker {
    private readonly now;
    private readonly blockedUntil;
    constructor(now?: () => number);
    recordRateLimit(id: string, retryAt: number): void;
    recordSuccess(id: string): void;
    isHealthy(id: string): boolean;
}
export interface ErrorClassification {
    retryable: boolean;
    fallback: boolean;
    rateLimited: boolean;
}
export declare function classifyModelError(error: unknown): ErrorClassification;
interface RouterOptions {
    maxRetries?: number;
    sleep?: (ms: number) => Promise<void>;
    jitter?: () => number;
    now?: () => number;
}
export declare class ModelRouter {
    private readonly candidates;
    private readonly transports;
    private readonly health;
    private readonly maxRetries;
    private readonly sleep;
    private readonly jitter;
    private readonly now;
    constructor(candidates: readonly ModelCandidate[], transports: Readonly<Record<string, ModelTransport>>, health?: RateLimitHealthTracker, options?: RouterOptions);
    eligible(request: ModelRequest): ModelCandidate[];
    route(request: ModelRequest): ModelCandidate;
    complete(request: ModelRequest): Promise<ModelResponse>;
}
export declare class ModelHttpError extends Error {
    readonly status: number;
    readonly retryAfterMs?: number | undefined;
    constructor(message: string, status: number, retryAfterMs?: number | undefined);
}
export interface OpenAICompatibleOptions {
    baseUrl: string;
    credential?: CredentialReference;
    fetch: typeof globalThis.fetch;
    defaultHeaders?: Readonly<Record<string, string>>;
    /**
     * Provider-specific request-body fields merged into every completion.
     *
     * The OpenAI chat schema is a lowest common denominator; a self-hosted
     * llama.cpp server accepts more (`chat_template_kwargs`, for one, which is
     * how a reasoning model is told not to emit its thinking trace). The
     * transport stays provider-neutral by never naming any of them: the caller
     * supplies the fields and they are merged UNDER the canonical ones, so
     * `model`, `messages`, `tools`, `tool_choice`, `max_tokens`, `temperature`
     * and `stream` always come from the request and can never be overridden here.
     */
    extraBody?: Readonly<Record<string, unknown>>;
    now?: () => number;
}
export declare class OpenAICompatibleTransport implements ModelTransport {
    private readonly options;
    constructor(options: OpenAICompatibleOptions);
    complete(request: ModelRequest): Promise<ModelResponse>;
}
export {};
