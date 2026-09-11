import type { Clock } from "./contracts.js";
export declare const systemClock: Clock;
/** A driveable clock for the selfcheck harness — lets invariants test time windows deterministically. */
export declare class ManualClock implements Clock {
    #private;
    constructor(startMs?: number);
    now(): number;
    advance(ms: number): void;
    set(ms: number): void;
}
