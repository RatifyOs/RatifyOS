import { type FastifyInstance } from "fastify";
export type Principal = {
    subject: string;
    tenantId: string;
    scopes: string[];
};
export type RunInput = {
    sessionId: string;
    input: string;
};
export interface AgentRuntime {
    start(input: RunInput, context: {
        runId: string;
        tenantId: string;
        emit: (type: string, data: unknown) => void;
    }): Promise<void>;
    cancel(runId: string, tenantId: string): Promise<boolean>;
    health(): Promise<Record<string, unknown>>;
}
export interface AgentApiAdapters {
    sessions: {
        get(id: string, tenant: string): Promise<unknown>;
        search(q: string, tenant: string): Promise<unknown[]>;
    };
    approvals: {
        get(id: string, tenant: string): Promise<unknown>;
        decide(id: string, decision: "approved" | "denied", tenant: string, actor: string): Promise<unknown>;
    };
}
type Event = {
    id: number;
    type: string;
    data: unknown;
};
type Run = {
    id: string;
    tenantId: string;
    subject: string;
    sessionId: string;
    status: "running" | "completed" | "failed" | "cancelled";
    createdAt: number;
    events: Event[];
};
export declare class MemoryRunStore {
    private retention;
    private runs;
    private keys;
    constructor(retention?: number);
    create(r: Run, key?: string): Run;
    idempotent(tenant: string, key: string): Run | undefined;
    get(id: string, tenant: string): Run | undefined;
    emit(id: string, type: string, data: unknown): void;
    active(tenant: string): number;
}
type Config = {
    authenticate: (authorization: string) => Promise<Principal | null>;
    runtime: AgentRuntime;
    store: MemoryRunStore;
    adapters: AgentApiAdapters;
    maxConcurrentRuns?: number;
    bodyLimit?: number;
    corsOrigin?: string | string[];
};
export declare function createAgentApi(c: Config): FastifyInstance;
export {};
