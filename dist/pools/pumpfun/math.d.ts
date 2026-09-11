/**
 * pump.fun bonding-curve mathematics — pure `bigint`, no floats anywhere on the
 * value path.
 *
 * The curve is a constant product over **virtual** reserves. Virtual reserves are
 * seeded above zero so the very first buy has a finite price; the *real* reserves
 * are what can actually be withdrawn, and they are what a liquidity floor must be
 * measured against. The invariant is
 *
 *     k = virtualSolReserves · virtualTokenReserves
 *
 * and every quote below reproduces the on-chain integer arithmetic — including its
 * `+ 1` round-ups — rather than a float approximation of it. Matching the rounding
 * matters: an off-by-one in the wrong direction turns a `max_sol_cost` into a
 * failed transaction, or worse, a silently worse fill.
 */
export interface CurveReserves {
    readonly virtualSolReserves: bigint;
    readonly virtualTokenReserves: bigint;
    readonly realSolReserves: bigint;
    readonly realTokenReserves: bigint;
    readonly tokenTotalSupply: bigint;
    readonly complete: boolean;
}
export declare class CurveMathError extends RangeError {
}
/** One `Fees` row from the pump fee program. */
export interface Fees {
    readonly lpFeeBps: bigint;
    readonly protocolFeeBps: bigint;
    readonly creatorFeeBps: bigint;
}
export interface FeeTier {
    readonly marketCapLamportsThreshold: bigint;
    readonly fees: Fees;
}
/**
 * Market cap in lamports, as the program computes it:
 * `virtualSolReserves · mintSupply / virtualTokenReserves`.
 */
export declare function bondingCurveMarketCap(args: {
    readonly mintSupply: bigint;
    readonly virtualSolReserves: bigint;
    readonly virtualTokenReserves: bigint;
}): bigint;
/**
 * Pick the fee tier for a market cap. Mirrors `pump-fees-math::calculate_fee_tier`:
 * below the first threshold the first tier applies; otherwise the **highest**
 * threshold at or below the market cap wins.
 */
export declare function calculateFeeTier(feeTiers: readonly FeeTier[], marketCapLamports: bigint): Fees;
/**
 * Total bps a bonding-curve trade pays: protocol + creator. `lpFeeBps` belongs to
 * PumpSwap pools, which have LPs; a curve does not, so counting it here would
 * overstate a buy's cost and — worse — understate a sell's proceeds, weakening
 * `min_sol_output`. Kept explicit rather than folded in silently.
 */
export declare function curveFeeBps(fees: Fees): bigint;
/**
 * Tokens received for `solIn` lamports **before** fees, reproducing the on-chain
 * form `tokens = virtualToken − (k / (virtualSol + solIn) + 1)`, clamped to the
 * real token reserves (the curve cannot sell tokens it does not hold).
 */
export declare function tokensForSol(r: CurveReserves, solIn: bigint): bigint;
/**
 * Lamports the curve charges for exactly `tokenAmount` tokens, **before** fees:
 * `newVirtualSol = k / (virtualToken − amount) + 1`, cost = the delta. This is the
 * direction the program actually computes, because `buy` takes a token amount.
 */
export declare function solCostForTokens(r: CurveReserves, tokenAmount: bigint): bigint;
/** Lamports returned for selling `tokenAmount`, **before** fees. */
export declare function solForTokens(r: CurveReserves, tokenAmount: bigint): bigint;
export interface BuyQuote {
    /** Tokens the buy instruction will request (`amount`). */
    readonly tokenAmount: bigint;
    /** Curve cost before fees. */
    readonly solCostLamports: bigint;
    readonly feeLamports: bigint;
    /** Cost + fee, the honest all-in price at the quoted state. */
    readonly totalLamports: bigint;
    /** `max_sol_cost` — total with the slippage bound applied. */
    readonly maxSolCostLamports: bigint;
    readonly feeBps: bigint;
    /** Lamports per token base unit at the quoted state (pre-trade spot). */
    readonly spotPriceLamports: number;
    /** Percent the trade itself moves the curve price. */
    readonly priceImpactPct: number;
}
/**
 * Quote a buy sized by **SOL to spend** — the way a human and an LLM think about
 * it, and the way the kernel caps it (the input leg is what leaves the wallet).
 *
 * The instruction takes a token amount, so the budget is first stripped of the fee
 * that will be charged on top of the curve cost, then converted to tokens. The
 * resulting `maxSolCostLamports` is what the transaction commits to and is always
 * ≥ `totalLamports`.
 */
export declare function quoteBuyForSolBudget(r: CurveReserves, solBudgetLamports: bigint, feeBps: bigint, slippageBps: number): BuyQuote;
export interface SellQuote {
    readonly tokenAmount: bigint;
    readonly grossSolLamports: bigint;
    readonly feeLamports: bigint;
    readonly netSolLamports: bigint;
    /** `min_sol_output` — net with the slippage bound applied. */
    readonly minSolOutputLamports: bigint;
    readonly feeBps: bigint;
    readonly spotPriceLamports: number;
    readonly priceImpactPct: number;
}
/** Quote a sell sized by token amount (the input leg for a sell is the token itself). */
export declare function quoteSell(r: CurveReserves, tokenAmount: bigint, feeBps: bigint, slippageBps: number): SellQuote;
/** UI price: SOL per whole token. Display only — never feed this to a cap. */
export declare function curveUiPrice(r: CurveReserves, tokenDecimals?: number): number;
/**
 * How far the curve is toward migration, 0..100. Derived from real token reserves
 * consumed against the launch's initial real reserves, which the caller supplies
 * from the `Global` account (it is not stored on the curve).
 */
export declare function curveProgressPct(r: CurveReserves, initialRealTokenReserves: bigint): number;
