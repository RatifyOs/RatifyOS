export type MemoryNamespace = "user" | "agent";
export interface Provenance {
    readonly source: string;
}
export interface MemoryEntry {
    readonly id: string;
    readonly namespace: MemoryNamespace;
    readonly value: string;
    readonly normalizedValue: string;
    readonly provenance: Provenance;
    readonly createdAt: number;
    readonly updatedAt: number;
}
export type MemoryOperation = {
    type: "add";
    entry: {
        namespace: MemoryNamespace;
        value: string;
        provenance: Provenance;
    };
} | {
    type: "replace";
    id: string;
    entry: {
        namespace: MemoryNamespace;
        value: string;
        provenance: Provenance;
    };
} | {
    type: "remove";
    id: string;
    namespace?: MemoryNamespace;
};
export interface MemorySnapshot {
    readonly sessionId: string;
    readonly revision: number;
    readonly createdAt: number;
    readonly entries: readonly MemoryEntry[];
}
export interface MemoryStoreOptions {
    now?: () => number;
    byteBudgets?: Partial<Record<MemoryNamespace, number>>;
    snapshotRetention?: number;
}
type ErrorCode = "REVISION_CONFLICT" | "SECRET_DETECTED" | "DUPLICATE" | "BUDGET_EXCEEDED" | "INVALID_OPERATION" | "CORRUPT_DATA";
export declare class MemoryStoreError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
export declare class MemoryStore {
    private readonly db;
    private readonly now;
    private readonly budgets;
    private readonly retention;
    constructor(path: string, options?: MemoryStoreOptions);
    close(): void;
    revision(): number;
    list(namespace?: MemoryNamespace): MemoryEntry[];
    forNamespace(namespace: MemoryNamespace): Readonly<{
        list: () => MemoryEntry[];
        applyBatch: (expectedRevision: number, operations: readonly ({
            type: "add";
            value: string;
            provenance: Provenance;
        } | {
            type: "replace";
            id: string;
            value: string;
            provenance: Provenance;
        } | {
            type: "remove";
            id: string;
        })[]) => {
            revision: number;
            entries: MemoryEntry[];
        };
    }>;
    private validate;
    applyBatch(expectedRevision: number, operations: readonly MemoryOperation[]): {
        revision: number;
        entries: MemoryEntry[];
    };
    private validateSessionId;
    startSession(sessionId: string): MemorySnapshot;
    getSessionSnapshot(sessionId: string): MemorySnapshot | undefined;
    listSessionSnapshots(): MemorySnapshot[];
    deleteSessionSnapshot(sessionId: string): boolean;
}
export {};
