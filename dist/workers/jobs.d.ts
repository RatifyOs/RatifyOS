import type { ZodType } from "zod";
import { type Schedule, type JobQueue, type Lease } from "../autonomy/jobs/index.js";
type Handler = (p: any, c: {
    signal: AbortSignal;
    lease: Lease;
}) => Promise<string | void>;
export declare class JobHandlerRegistry {
    private m;
    register(type: string, schema: ZodType, handler: Handler): this;
    get(type: string): {
        schema: ZodType;
        handler: Handler;
    } | undefined;
}
export declare class JobWorker {
    private q;
    private r;
    private o;
    private stopRequested;
    private active;
    constructor(q: JobQueue, r: JobHandlerRegistry, o: {
        workerId: string;
        leaseMs: number;
        pollMs?: number;
        concurrency?: number;
    });
    runOnce(): Promise<boolean>;
    run(): Promise<void>;
    stop(): Promise<void>;
}
export declare class DurableScheduler {
    private q;
    private o;
    private db;
    constructor(path: string, q: JobQueue, o?: {
        clock?: () => number;
    });
    upsert(id: string, type: string, payload: unknown, schedule: Schedule): void;
    tick(): number;
    close(): void;
}
export {};
