export type MessageRole = "user" | "assistant" | "system" | "tool";
export type RunStatus = "running" | "completed" | "failed" | "cancelled";
export interface Session {
    id: string;
    title?: string;
    parentSessionId?: string;
    parentMessageId?: string;
    createdAt: number;
}
export interface Message {
    id: string;
    sessionId: string;
    role: MessageRole;
    content: string;
    createdAt: number;
    sequence: number;
}
export interface Run {
    id: string;
    sessionId: string;
    status: RunStatus;
    startedAt: number;
    finishedAt?: number;
}
export interface ToolCall {
    id: string;
    sessionId: string;
    messageId: string;
    toolName: string;
    arguments: unknown;
    createdAt: number;
}
export interface ToolResult {
    id: string;
    toolCallId: string;
    output: unknown;
    createdAt: number;
    evidenceRef?: string;
}
export interface FinancialEvidence {
    id: string;
    payload: unknown;
    sha256: string;
    createdAt: number;
}
export interface SearchHit {
    message: Message;
    context: Message[];
}
export declare class SessionStore {
    private readonly db;
    private depth;
    private fts;
    constructor(path: string);
    private migrate;
    schemaVersion(): number;
    journalMode(): string;
    close(): void;
    createSession(i: {
        id: string;
        title?: string;
        parentSessionId?: string;
        parentMessageId?: string;
        createdAt?: number;
    }): {
        createdAt: number;
        parentSessionId?: string;
        parentMessageId?: string;
        title?: string;
        id: string;
    };
    branchSession(i: {
        id: string;
        parentSessionId: string;
        parentMessageId: string;
        title?: string;
        createdAt?: number;
    }): {
        createdAt: number;
        parentSessionId?: string;
        parentMessageId?: string;
        title?: string;
        id: string;
    };
    getSession(id: string): {
        createdAt: number;
        parentSessionId?: string;
        parentMessageId?: string;
        title?: string;
        id: string;
    } | undefined;
    private mm;
    appendMessage(i: Omit<Message, "sequence">): Message;
    getMessages(id: string, o?: {
        includeAncestors?: boolean;
    }): Message[];
    createRun(i: {
        id: string;
        sessionId: string;
        status: RunStatus;
        startedAt: number;
    }): {
        finishedAt?: number;
        id: string;
        sessionId: string;
        status: RunStatus;
        startedAt: number;
    };
    finishRun(id: string, i: {
        status: Exclude<RunStatus, "running">;
        finishedAt: number;
    }): {
        finishedAt?: number;
        id: string;
        sessionId: string;
        status: RunStatus;
        startedAt: number;
    };
    getRun(id: string): {
        finishedAt?: number;
        id: string;
        sessionId: string;
        status: RunStatus;
        startedAt: number;
    } | undefined;
    listUnfinishedRuns(): {
        finishedAt?: number;
        id: string;
        sessionId: string;
        status: RunStatus;
        startedAt: number;
    }[];
    getRecoveryState(id: string): {
        run: {
            finishedAt?: number;
            id: string;
            sessionId: string;
            status: RunStatus;
            startedAt: number;
        };
        session: {
            createdAt: number;
            parentSessionId?: string;
            parentMessageId?: string;
            title?: string;
            id: string;
        };
        messages: Message[];
    };
    recordFinancialEvidence(i: {
        id: string;
        payload: unknown;
        createdAt: number;
    }): {
        id: string;
        payload: unknown;
        sha256: string;
        createdAt: number;
    };
    recordToolCall(i: ToolCall): ToolCall;
    recordToolResult(i: ToolResult): {
        evidenceRef?: string;
        id: string;
        toolCallId: string;
        output: unknown;
        createdAt: number;
    };
    getToolExchange(id: string): {
        result?: {
            evidenceRef?: string;
            id: string;
            toolCallId: string;
            output: unknown;
            createdAt: number;
        };
        call: ToolCall;
    } | undefined;
    transaction<T>(fn: (s: SessionStore) => T): T;
    search(q: string, o?: {
        sessionId?: string;
        contextBefore?: number;
        contextAfter?: number;
        limit?: number;
    }): {
        message: Message;
        context: Message[];
    }[];
}
