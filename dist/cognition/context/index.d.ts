export type ContextRole = "system" | "user" | "assistant" | "tool";
export type FinancialMessageKind = "approval" | "policy" | "simulation" | "transaction" | "receipt";
export interface ContextToolCall {
    id: string;
    name: string;
    arguments: unknown;
}
export interface ContextMessage {
    id: string;
    role: ContextRole;
    content: string;
    name?: string;
    toolCallId?: string;
    toolCalls?: readonly ContextToolCall[];
    kind?: FinancialMessageKind | "handoff-summary";
    active?: boolean;
    evidenceRef?: string;
}
export interface SummaryReference {
    messageId: string;
    description: string;
    evidenceRef?: string;
}
export interface HandoffSummary {
    version: 1;
    overview: string;
    references: SummaryReference[];
}
export interface SummaryInput {
    messages: readonly ContextMessage[];
    priorSummary?: HandoffSummary;
    requiredReferences: readonly SummaryReference[];
}
export type ContextSummarizer = (input: SummaryInput) => Promise<{
    overview: string;
    references: SummaryReference[];
}>;
export interface CompileOptions {
    maxTokens: number;
    headMessages?: number;
    tailMessages?: number;
    estimateTokens?: (message: ContextMessage) => number;
    summarizer?: ContextSummarizer;
    priorSummary?: HandoffSummary;
    largeToolResultTokens?: number;
    summarizerTimeoutMs?: number;
}
export interface ContextDiagnostics {
    initialTokens: number;
    finalTokens: number;
    prunedMessageIds: string[];
    protectedMessageIds: string[];
    evidenceReferences: string[];
    overBudget: boolean;
    summarized: boolean;
}
export interface CompiledContext {
    messages: ContextMessage[];
    summary?: HandoffSummary;
    diagnostics: ContextDiagnostics;
}
export declare function compileContext(input: readonly ContextMessage[], options: CompileOptions): Promise<CompiledContext>;
