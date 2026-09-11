/**
 * A real single-instance boot lock — the mechanism the kernel store's cap-safety
 * assumes. The reserve→settle transaction is only atomic *within one process*;
 * two engines sharing the same SQLite file (WAL allows concurrent connections)
 * could each pass the cap check before the other's reservation row is visible,
 * silently bypassing the spend cap. This lock makes "one writer per home dir" an
 * enforced invariant instead of an unwritten assumption.
 *
 * Implementation: an exclusive-create lockfile (`open` with `wx`) holding the
 * owning pid. A leftover file from a crashed process is reclaimed only when its
 * pid is provably dead — never on a timer, so a slow-but-alive engine is never
 * stolen from under.
 */
export declare class ProcessLock {
    #private;
    constructor(path: string);
    /** Acquire the lock or throw if another *live* process already holds it. */
    acquire(): void;
    /** Release the lock. Safe to call more than once. */
    release(): void;
}
export declare class LockHeldError extends Error {
    readonly heldByPid: number;
    constructor(path: string, pid: number);
}
