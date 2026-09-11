export type DurableEvent = {
    id: number;
    type: string;
    data: unknown;
};
export type DurableRun = {
    id: string;
    tenantId: string;
    subject?: string;
    sessionId: string;
    status: "running" | "completed" | "failed" | "cancelled";
    createdAt: number;
    events: DurableEvent[];
};
export declare class DurableRunStore {
    private retention;
    private db;
    constructor(path: string, retention?: number);
    create(r: DurableRun, key?: string): DurableRun;
    idempotent(tenant: string, key: string): DurableRun | undefined;
    get(id: string, tenant: string): DurableRun | undefined;
    emit(id: string, type: string, data: unknown): {
        id: number;
        type: string;
        data: unknown;
    };
    active(tenant: string): number;
    setStatus(id: string, status: DurableRun["status"]): void;
    close(): void;
}
