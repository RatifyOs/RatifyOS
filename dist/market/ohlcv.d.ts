/**
 * An exact price, kept as a reduced fraction.
 *
 * Candles are aggregated in integer arithmetic end to end: a mid price of one
 * base unit against another has no exact float representation, and rounding at
 * aggregation time would make the open/high/low/close of a bucket depend on the
 * order the trades arrived in.
 */
export interface Rational {
    numerator: bigint;
    denominator: bigint;
}
/** Reduces to lowest terms so equal prices compare equal by value. */
export declare function rational(n: bigint, d: bigint): Rational;
/**
 * One executed trade on a pair.
 *
 * `slot` and `sequence` are the deterministic tie-break for trades sharing a
 * timestamp: the cluster slot the trade landed in, then its position within
 * that slot.
 */
export interface MarketTrade {
    id: string;
    timestamp: number;
    price: Rational;
    baseAmount: bigint;
    quoteAmount: bigint;
    slot: bigint;
    sequence: number;
}
export interface Candle {
    start: number;
    end: number;
    open: Rational;
    high: Rational;
    low: Rational;
    close: Rational;
    baseVolume: bigint;
    quoteVolume: bigint;
    trades: number;
}
/** Aggregates sparse candles; no synthetic gap candles are emitted. Duplicate IDs are ignored. */
export declare function aggregateCandles(input: readonly MarketTrade[], intervalSeconds: number): Candle[];
export declare function marketAnalytics(trades: readonly MarketTrade[], activeLiquidity: bigint): {
    tradeCount: number;
    baseVolume: bigint;
    quoteVolume: bigint;
    vwap: Rational | null;
    low: Rational | null;
    high: Rational | null;
    activeLiquidity: bigint;
    quotePerLiquidity: Rational | null;
};
