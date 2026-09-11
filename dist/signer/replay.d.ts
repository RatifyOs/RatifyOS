import type { ExecutionState, ReplayStore } from "./authorization.js";
export interface ReplayRow {
    id: string;
    expiresAt: number;
    state: ExecutionState;
    version: number;
    data: string | null;
    updatedAt: number;
    recovered?: number;
}
/**
 * Durable one-time authorization fence.
 *
 * `consume` is an INSERT OR IGNORE, so an authorization id can be claimed
 * exactly once even across a signer restart or two concurrent connections.
 * `transition` is a compare-and-set on the current state, which is what makes
 * `claimed -> expired` and `claimed -> signed` mutually exclusive.
 */
export declare class SqliteReplayStore implements ReplayStore {
    private db;
    constructor(path: string);
    consume(id: string, expiresAt: number): Promise<boolean>;
    transition(id: string, from: ExecutionState, to: ExecutionState, data?: string): Promise<boolean>;
    get(id: string): ReplayRow | undefined;
    /**
     * Release the signed bytes to exactly one caller. The `recovered=0`
     * predicate makes concurrent recovery attempts mutually exclusive.
     */
    recoverSigned(id: string): {
        data: string;
    } | undefined;
    list(states: ExecutionState[]): ReplayRow[];
    close(): void;
}
