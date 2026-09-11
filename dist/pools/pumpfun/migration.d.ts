import { type Refusal } from "../errors.js";
import type { CurveState } from "./client.js";
/**
 * Pre- vs post-migration routing.
 *
 * A pump.fun token lives on its bonding curve until the curve completes, at which
 * point liquidity moves to PumpSwap and the token becomes routable by aggregators.
 * Those are two different execution paths, and picking the wrong one does not fail
 * cleanly — a bonding-curve instruction against a completed curve reverts, and a
 * Jupiter route against a live curve either finds nothing or finds a sliver of
 * side liquidity and fills at a terrible price.
 *
 * So the choice is made explicitly here, as data, and `pumpfun_buy` / `pumpfun_sell`
 * **delegate** rather than guess: a migrated token is answered with
 * `route: 'jupiter'`, which the tool surfaces as an instruction to use the existing
 * `swap_jupiter` path. This package never re-implements what Jupiter already does.
 */
export type CurveRoute = "bonding-curve" | "jupiter";
export interface RoutingDecision {
    readonly route: CurveRoute;
    readonly reason: string;
    /** Set when the caller must be stopped rather than redirected. */
    readonly refusal: Refusal | null;
}
/** No curve account at all: the mint was never a pump launch, so it is Jupiter's problem. */
export declare function routeForMissingCurve(mint: string): RoutingDecision;
/**
 * Decide how to trade a token whose curve we could read.
 *
 * The refusals here are the shapes this package deliberately does not build:
 * a non-SOL quote mint, a Token-2022 base mint, mayhem or cashback coins — all of
 * which require pump's `buy_v2` with its 27-account layout. Approximating them
 * with the legacy instruction would produce a transaction that either reverts or,
 * worse, transacts against the wrong accounts.
 */
export declare function routeForCurve(curve: CurveState): RoutingDecision;
