export declare const LAMPORTS_PER_SOL = 1000000000n;
export declare const SOL_DECIMALS = 9;
export declare const USDC_DECIMALS = 6;
/** Wrapped SOL — also the sentinel mint for native SOL throughout the kernel. */
export declare const WSOL_MINT = "So11111111111111111111111111111111111111112";
export declare const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export declare const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
/** The assets in which spend caps are denominated (the "input leg"). */
export declare const SOL_QUOTE_MINTS: readonly string[];
export declare const USDC_QUOTE_MINTS: readonly string[];
export type QuoteBucket = "sol" | "usdc";
/**
 * Returns the cap bucket an input mint draws from, or null when it is not a
 * quote asset (i.e. a sell, which receives quote rather than spending it).
 */
export declare function quoteBucketFor(mint: string): QuoteBucket | null;
export interface TokenAmount {
    readonly mint: string;
    readonly amount: bigint;
    readonly decimals: number;
}
/**
 * Parse a UI amount (e.g. 1.5 SOL) to base units WITHOUT float drift.
 * Accepts a number or a decimal string; rejects exponent / negative / junk.
 */
export declare function toBaseUnits(amount: number | string, decimals: number): bigint;
/** base units → JS number (display only; never use the result for cap math). */
export declare function fromBaseUnits(amount: bigint, decimals: number): number;
export declare function formatAmount(amount: bigint, decimals: number, maxFractionDigits?: number): string;
/** Effective slippage in bps between an expected and an actual (received) amount. */
export declare function slippageBps(expected: bigint, actual: bigint): number;
