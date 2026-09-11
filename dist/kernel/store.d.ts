import type { JournalEvent, TradeState } from "./contracts.js";
import type { QuoteBucket } from "./money.js";
export interface SpendCapsBaseUnits {
    readonly perTrade: bigint;
    readonly perHour: bigint;
    readonly perDay: bigint;
}
export type ReserveDenyReason = "perTrade" | "perHour" | "perDay";
export type ReserveOutcome = {
    readonly ok: true;
    readonly reservationId: string;
    readonly usedHour: bigint;
    readonly usedDay: bigint;
} | {
    readonly ok: false;
    readonly reason: ReserveDenyReason;
    readonly cap: bigint;
    readonly would: bigint;
};
export interface ReserveArgs {
    readonly bucket: QuoteBucket;
    readonly amount: bigint;
    readonly caps: SpendCapsBaseUnits;
    readonly tradeId: string;
    readonly now: number;
}
export interface NewTradeRow {
    readonly id: string;
    readonly idempotencyKey: string;
    readonly intentJson: string;
    readonly inputMint: string;
    readonly outputMint: string;
    readonly inputAmount: bigint;
    readonly lastValidBlockHeight: number;
    readonly now: number;
}
export interface TradeRow {
    readonly id: string;
    readonly idempotency_key: string;
    readonly state: TradeState;
    readonly intent_json: string;
    readonly signature: string | null;
    readonly input_mint: string;
    readonly output_mint: string;
    readonly input_amount: string;
    readonly last_valid_block_height: number;
    readonly signed_wire: string | null;
    readonly error: string | null;
    readonly reservation_id: string | null;
    readonly created_at: number;
    readonly updated_at: number;
}
/**
 * The kernel's single-writer store. `node:sqlite` is synchronous, so the reserve
 * transaction is atomic within this process; combined with the engine's
 * boot-time {@link ProcessLock} (one writer per home dir, enforced — see
 * `src/kernel/lock.ts`) this gives race-free reserve-then-settle. The lock is
 * what makes the cross-process half of that guarantee real rather than assumed:
 * without it, a second engine on the same DB could pass the cap check before the
 * first reservation row is visible.
 */
export declare class KernelStore {
    #private;
    constructor(dbPath?: string);
    /** Cumulative active spend in the rolling hour and day windows for a bucket. */
    usage(bucket: QuoteBucket, now: number): {
        hour: bigint;
        day: bigint;
    };
    /** Claim an idempotency key. Returns false if it was already used (a duplicate). */
    claimIdempotency(key: string, tradeId: string, now: number): boolean;
    getTradeByIdempotency(key: string): TradeRow | undefined;
    getTrade(id: string): TradeRow | undefined;
    /**
     * Reserve against the input-leg cap. The window sums and the insert happen in
     * one transaction so two concurrent intents cannot both observe the same
     * pre-reservation usage and jointly exceed the cap.
     */
    reserve(args: ReserveArgs): ReserveOutcome;
    releaseReservation(reservationId: string): void;
    consumeReservation(reservationId: string): void;
    insertTrade(row: NewTradeRow, reservationId: string | null): void;
    /** Persist the fully-signed wire tx BEFORE broadcast (so a crash can be reconciled, never re-signed). */
    persistSigned(id: string, signedWire: string, signature: string, now: number): void;
    setState(id: string, state: TradeState, now: number): void;
    setSignature(id: string, signature: string, now: number): void;
    fail(id: string, state: TradeState, error: string, now: number): void;
    /** Trades that were broadcast but never reached a terminal state — the reconciler's work list. */
    pendingSent(): TradeRow[];
    /** The most recent trades, newest-first — for the agent's "what did I trade" read tool. */
    recentTrades(limit?: number): TradeRow[];
    appendJournal(event: JournalEvent): void;
    /**
     * The newest journal rows across every trade, newest-first.
     *
     * {@link readJournal} answers "what happened to THIS trade"; the operator
     * console needs "what has the kernel been doing", which is the same table
     * read the other way round. `seq` comes back with the event because it is the
     * only stable, total ordering the journal has — `at` can collide.
     */
    recentJournal(limit?: number): {
        seq: number;
        event: JournalEvent;
    }[];
    readJournal(tradeId: string): JournalEvent[];
    close(): void;
}
