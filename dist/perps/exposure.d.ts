import { type QuoteBucket } from "../kernel/money.js";
import type { PerpPosition } from "./types.js";
/**
 * Aggregate portfolio perp exposure, denominated per input-leg bucket.
 *
 * Pure and synchronous: the caller does the network read, this does the maths.
 * That split is what makes the portfolio cap unit-testable and keeps every guard
 * free of I/O.
 */
export interface PortfolioExposure {
    readonly openPositions: number;
    readonly notionalByBucket: Readonly<Record<QuoteBucket, bigint>>;
    readonly collateralByBucket: Readonly<Record<QuoteBucket, bigint>>;
    /**
     * Set when the exposure could not be established cleanly — the venue read
     * failed, or a position is denominated in something we cannot bucket. Guards
     * MUST refuse to open into a stale exposure snapshot: an unknown existing
     * exposure plus a new position is an unbounded total.
     */
    readonly stale: boolean;
    readonly staleReason: string | undefined;
    /** Positions whose collateral mint is not a recognised quote asset. */
    readonly unbucketed: number;
}
/** An exposure snapshot that every opening guard will refuse. Use whenever a read fails. */
export declare function staleExposure(reason: string): PortfolioExposure;
export declare function emptyExposure(): PortfolioExposure;
export declare function exposureFrom(positions: readonly PerpPosition[]): PortfolioExposure;
/** The position in `symbol`, if any. Case-insensitive on the canonical symbol. */
export declare function positionIn(positions: readonly PerpPosition[], symbol: string): PerpPosition | undefined;
