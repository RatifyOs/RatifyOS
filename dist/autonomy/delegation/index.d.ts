export type DelegationStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type CapabilityEffect = "read" | "write" | "execute" | "network";
export interface CapabilityGrant {
    name: string;
    effect: CapabilityEffect;
}
export interface CapabilityEnforcer {
    authorize(capability: string, metadata: {
        sessionId: string;
        parentSessionId: string;
    }): boolean;
}
export interface ChildRuntimeInput {
    task: string;
    sessionId: string;
    context: unknown;
    model?: unknown;
    capabilities: readonly string[];
    maxIterations: number;
    deadline: number;
    signal: AbortSignal;
    metadata: {
        parentSessionId: string;
        depth: number;
    };
}
export interface ChildRuntimeResult {
    summary: string;
    iterations: number;
    costUsd: number;
    details?: unknown;
}
export interface ChildRuntime {
    run(input: ChildRuntimeInput): Promise<ChildRuntimeResult>;
}
export interface SpawnRequest {
    task: string;
    parentSessionId: string;
    parentCapabilities: readonly string[];
    requestedCapabilities: readonly string[];
    depth?: number;
    context?: unknown;
    model?: unknown;
}
export interface DelegationResult {
    sessionId: string;
    parentSessionId: string;
    status: Exclude<DelegationStatus, "queued" | "running">;
    summary?: string;
    details?: unknown;
    iterations?: number;
    costUsd?: number;
    error?: string;
    announced: boolean;
    archived: boolean;
}
export interface DelegationHandle {
    readonly sessionId: string;
    readonly status: DelegationStatus;
    readonly result: Promise<DelegationResult>;
    cancel(reason?: unknown): void;
}
export interface DelegationLimits {
    maxDepth: number;
    maxChildren: number;
    maxIterations: number;
    deadlineMs: number;
    maxCostUsd: number;
    concurrency: number;
}
export interface DelegationOptions {
    runtimeFactory: (metadata: {
        sessionId: string;
        parentSessionId: string;
        depth: number;
    }) => ChildRuntime;
    limits?: Partial<DelegationLimits>;
    capabilities?: readonly CapabilityGrant[];
    capabilityEnforcer?: CapabilityEnforcer;
    verifyResult?: (result: ChildRuntimeResult, metadata: {
        sessionId: string;
        parentSessionId: string;
    }) => boolean | Promise<boolean>;
    verifierTimeoutMs?: number;
    announce?: (result: DelegationResult) => void | Promise<void>;
    archive?: (result: DelegationResult) => void | Promise<void>;
}
export declare class DelegationError extends Error {
    constructor(message: string);
}
export declare class DelegationManager {
    #private;
    constructor(options: DelegationOptions);
    spawn(request: SpawnRequest): DelegationHandle;
    cancelParent(parent: string, reason?: unknown): void;
    authorizeDispatch(sessionId: string, capability: string): boolean;
}
