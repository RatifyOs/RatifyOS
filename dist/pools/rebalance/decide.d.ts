import type { PoolGuardCode } from "../errors.js";
import { type BinRange } from "../meteora/bins.js";
import type { LiquidityShape, LpPosition, PoolSummary } from "../types.js";
import { type RebalanceHistory } from "./ledger.js";
/**
 * The rebalance decision — pure, synchronous, and completely separate from
 * execution. It answers one question: *given this position and this target,
 * should we move the range right now?* Nothing in here builds a transaction,
 * touches the network, or reads a clock; `now` is an argument.
 *
 * Four independent brakes, all of which must release before the answer is yes:
 *
 *  1. **Drift** — the active bin must have left (or be closing on) the range by
 *     more than `driftBins`, so a price wobbling across one bin boundary cannot
 *     ping-pong the position.
 *  2. **Interval** — `minIntervalMs` since the last rebalance of this position.
 *  3. **Daily cap** — at most `maxPerDay` in a rolling 24h window.
 *  4. **Economics** — projected fees over the horizon must beat the round-trip
 *     cash cost (and, in strict mode, the divergence loss the move crystallises).
 *     A rebalance that costs more than it earns is *rejected*, not warned about.
 *
 * On the oracle question: the safety-critical caps in `guards.ts` are oracle-free
 * by construction. The economics here are not — valuing a position's base leg in
 * quote terms needs a price. That is acceptable precisely because this is an
 * optimisation, not a safety gate: a wrong price here can make us skip a
 * profitable rebalance or spend one transaction fee. It can never move more value
 * than the kernel's input-leg cap already permits.
 */
export interface RebalancePolicy {
    /** Bins the active bin must drift past a range edge before acting. */
    readonly driftBins: number;
    /**
     * Also fire while still *inside* the range once the active bin sits within this
     * fraction of an edge (0..0.5). 0 disables it — wait for a true exit. Acting
     * early keeps the position earning; acting too early is churn, hence the brakes.
     */
    readonly edgeTriggerPct: number;
    readonly minIntervalMs: number;
    readonly maxPerDay: number;
    /** How far ahead to project fee income when judging the trade-off. */
    readonly horizonMs: number;
    /** When true, projected fees must also cover the crystallised divergence loss. */
    readonly requireIlRecovery: boolean;
    /** Absolute net-benefit floor in quote base units, so we never churn for dust. */
    readonly minNetBenefitQuote: bigint;
    /** Target range shape, in bins either side of the new active bin. */
    readonly targetBelowBins: number;
    readonly targetAboveBins: number;
    readonly shape: LiquidityShape;
}
/** Conservative: act only on a real exit, once an hour at most, 4 a day, must pay for itself. */
export declare function defaultRebalancePolicy(): RebalancePolicy;
/**
 * Economic inputs, all in the pool's **quote** base units. Every field is
 * nullable and a null is a *rejection*, never an assumption — the same
 * fail-closed rule the guards use.
 */
export interface RebalanceEconomics {
    /** Fee income this position's notional would earn per day back in range. */
    readonly projectedFeesPerDayQuote: bigint | null;
    /** Round-trip cash cost: base + priority fees plus the net rent delta. */
    readonly txCostQuote: bigint | null;
    /** Cost of converting inventory to fit the new range (the pool's own fee on the crossing notional). */
    readonly inventorySwapCostQuote: bigint | null;
    /** Position notional, both legs valued at the current price. Used only for the IL term. */
    readonly positionNotionalQuote: bigint | null;
    /** UI price at which the position was opened. Null ⇒ the IL term cannot be computed. */
    readonly entryUiPrice: number | null;
    /** Fees already claimable. Reported, never counted as a benefit — see below. */
    readonly claimableFeesQuote: bigint;
}
export interface EconomicsBreakdown {
    readonly projectedFeesQuote: bigint;
    readonly cashCostQuote: bigint;
    readonly divergenceCostQuote: bigint;
    readonly netBenefitQuote: bigint;
    readonly claimableFeesQuote: bigint;
    readonly divergenceLossPct: number | null;
}
export type RebalanceOutcome = "rebalance" | "hold";
export interface RebalanceDecision {
    readonly action: RebalanceOutcome;
    readonly code: PoolGuardCode | "REBALANCE_OK";
    readonly reason: string;
    /** The range to move to. Present only when `action === 'rebalance'`. */
    readonly targetRange: BinRange | null;
    readonly currentRange: BinRange;
    /** Signed bin drift of the active bin vs the current range (0 = inside). */
    readonly drift: number;
    /** 0..1 position of the active bin within the range, or null when outside. */
    readonly rangeFraction: number | null;
    readonly economics: EconomicsBreakdown | null;
}
export interface RebalanceSubject {
    readonly position: LpPosition;
    readonly pool: PoolSummary;
    readonly policy: RebalancePolicy;
    readonly economics: RebalanceEconomics;
    readonly history?: RebalanceHistory;
    readonly now: number;
}
/**
 * Should this position be rebalanced right now? Returns a decision, never throws
 * for ordinary bad inputs — a malformed position is a `hold`, because "we do not
 * understand this position" must mean "do not touch it".
 */
export declare function decideRebalance(s: RebalanceSubject): RebalanceDecision;
/**
 * The trade-off, computed once and reported whole.
 *
 * Benefit is **only** the fees the position would earn back in range over the
 * horizon. `claimableFeesQuote` is deliberately excluded: those fees can be
 * collected by a bare `claim` without moving the range, so counting them as a
 * reason to rebalance would let any position with accrued fees justify an
 * arbitrarily expensive move. Reported, never credited.
 *
 * Cost is the round-trip cash out of the wallet, plus — in strict mode — the
 * divergence loss the move crystallises versus the entry price.
 *
 * Returns null when any required input is missing, which the caller must treat as
 * a rejection.
 */
export declare function computeEconomics(s: RebalanceSubject, targetRange: BinRange): EconomicsBreakdown | null;
