import type { ZodType } from "zod";
export type JobStatus = "scheduled" | "queued" | "running" | "succeeded" | "failed" | "cancelled" | "dead-letter";
export interface Job {
    id: string;
    type: string;
    payload: unknown;
    status: JobStatus;
    scheduledAt: number;
    attemptCount: number;
    maxAttempts: number;
    resultRef?: string;
    error?: string;
    cancelRequested: boolean;
}
export interface Lease {
    job: Job;
    workerId: string;
    fencingToken: number;
    leaseExpiresAt: number;
}
export interface Attempt {
    number: number;
    workerId: string;
    fencingToken: number;
    startedAt: number;
    finishedAt?: number;
    outcome?: "succeeded" | "failed" | "cancelled";
    error?: string;
    resultRef?: string;
}
export type Schedule = {
    at: number;
} | {
    everyMs: number;
} | {
    cron: string;
};
export declare class JobQueue {
    private db;
    private closed;
    private draining;
    private schemas;
    private clock;
    private random;
    constructor(path: string, options?: {
        clock?: () => number;
        random?: () => number;
    });
    private open;
    private now;
    private tx;
    register(type: string, schema: ZodType): this;
    enqueue(type: string, payload: unknown, o?: {
        id?: string;
        idempotencyKey?: string;
        scheduledAt?: number;
        maxAttempts?: number;
        backoffMs?: number;
        jitter?: number;
    }): Job;
    get(id: string): Job | undefined;
    private getRaw;
    private map;
    claim(workerId: string, leaseMs: number): Lease | undefined;
    heartbeat(l: Lease, leaseMs: number): boolean;
    complete(l: Lease, o: {
        resultRef?: string;
    }): boolean;
    fail(l: Lease, error: string): boolean;
    cancel(id: string): boolean;
    isCancellationRequested(l: Lease): boolean;
    attempts(id: string): Attempt[];
    beginDrain(): void;
    drain(timeoutMs?: number): Promise<void>;
    close(): void;
}
export declare function nextScheduleTime(schedule: Schedule, after: number): number;
