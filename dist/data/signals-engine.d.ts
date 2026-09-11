import type { RugHeat, RugHeatSource } from "../pools/signals.js";
import type { TradeTape } from "./tape.js";
/**
 * Heuristics layered on top of the raw tape. `rugHeatScore` distils a token's
 * recent trade flow into a 0..100 "how sketchy does this look" number with
 * human-readable reasons; `summary` pairs that with the windowed signals as one
 * line. Pure reads off the tape — no I/O, so it is safe to call from inside a
 * guard.
 *
 * This is the producer for the {@link RugHeatSource} port declared in
 * `src/pools/signals.ts`. Mounting it is what gives `guardRugHeat` a reading at
 * all: with nothing mounted the guard refuses every curve buy, and with this
 * mounted over an EMPTY tape it still refuses (an unseen mint scores 60, at the
 * default rejection threshold). A permissive answer requires observed trades.
 *
 * NOT financial advice — a triage gauge, deliberately biased towards refusing.
 */
export declare class SignalsEngine implements RugHeatSource {
    #private;
    constructor(tape: TradeTape);
    /** The tape this engine reads. Exposed so a feed can write to the same one. */
    get tape(): TradeTape;
    /**
     * A 0..100 rug-heat heuristic over the trailing `windowMs`. Higher = riskier.
     * Tells we weight: a tiny/empty unique-buyer set, lopsided buy/sell pressure
     * (in either direction), thin SOL volume, and one-sided sell dumps.
     */
    rugHeatScore(mint: string, windowMs?: number): RugHeat;
    /** One-line human summary: windowed signals + rug-heat verdict. */
    summary(mint: string, windowMs?: number): string;
}
/** Coarse label for a rug-heat score. */
export declare function rating(score: number): string;
