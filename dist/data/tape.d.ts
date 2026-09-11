/**
 * The trade tape — a per-mint ring buffer of recent on-chain trades plus the
 * pure, synchronous signal math computed over a trailing time window. No I/O
 * and no clock injection: callers feed trades in (each already stamped with
 * `ts`), and `signals()` reads `Date.now()` once to bound the window. Cheap
 * enough to call on every poll tick.
 *
 * This module is deliberately the only place trade history lives. The feed
 * (`pumpportal.ts`) writes to it and the heuristics (`signals-engine.ts`) read
 * from it, so a signals reading is always a function of observed trades and
 * never of a network call made mid-guard.
 */
/** A single buy or sell printed to the tape. `solAmount` is the SOL leg size. */
export interface TapeTrade {
    readonly mint: string;
    readonly solAmount: number;
    readonly isBuy: boolean;
    readonly trader: string;
    readonly ts: number;
    /** Token price in SOL at the time of the fill, when the feed provides it. */
    readonly priceSol?: number | undefined;
}
/** Windowed market-microstructure signals for one mint. */
export interface TokenSignals {
    readonly mint: string;
    readonly buys: number;
    readonly sells: number;
    /** Buy SOL volume minus sell SOL volume over the window (positive = inflow). */
    readonly netSolFlow: number;
    /** Total SOL traded (buys + sells) over the window. */
    readonly volumeSol: number;
    readonly uniqueBuyers: number;
    readonly uniqueSellers: number;
    /** buys / (buys + sells) * 100 by COUNT; 0 when there are no trades. */
    readonly buyPressurePct: number;
    /**
     * buyVol / (buyVol + sellVol) * 100 by SOL SIZE; 0 when no volume. The honest
     * "pressure" number — one whale buy outweighs a hundred dust buys.
     */
    readonly volumeWeightedBuyPressurePct: number;
    /** Largest single trade (SOL) in the window — a size outlier / whale tell. */
    readonly largestTradeSol: number;
    /**
     * % price change from the earliest to the latest priced trade in the window
     * (undefined when fewer than two trades carried a price).
     */
    readonly priceChangePct?: number | undefined;
    /** Price (SOL) of the most recent trade in the window that carried one. */
    readonly lastPriceSol?: number | undefined;
    /** Trade count in the window (buys + sells). */
    readonly trades: number;
}
export declare class TradeTape {
    #private;
    constructor(maxPerMint?: number);
    /** Append a trade, evicting the oldest once a mint's buffer is over cap. */
    addTrade(t: TapeTrade): void;
    /** A copy of the current tape for a mint, oldest-first. Empty when unseen. */
    trades(mint: string): TapeTrade[];
    /** Mints currently tracked on the tape. */
    mints(): string[];
    /** Total trades held across every mint — the feed's liveness proxy. */
    size(): number;
    /**
     * Pure signal roll-up over the trailing `windowMs`. Trades with `ts` older
     * than the window are ignored; `lastPriceSol` reflects the most recent
     * in-window trade that carried a price.
     */
    signals(mint: string, windowMs?: number): TokenSignals;
}
