import type { PositionReader } from "../kernel/contracts.js";
import type { PerpsVenue } from "./venue.js";
/**
 * Adapt a {@link PerpsVenue} to the kernel's {@link PositionReader}.
 *
 * This is the piece that lets `TradeGateway` verify a perp fill at all. A perp
 * order does not move a token balance — collateral leaves the wallet on an open
 * and comes back on a close — so the gateway diffs the venue POSITION across
 * the transaction instead, and requires it to move in the order's direction by
 * at least `perp.minBaseAmount`.
 *
 * Two properties matter and are both deliberate:
 *
 *  - **Signed, not sided.** `PerpPosition` carries an unsigned `baseAmount`
 *    plus a `side`. A settle check needs one comparable number across "flat →
 *    long", "long → flatter" and "long → short", so the side is folded into the
 *    sign here: positive = long, negative = short.
 *  - **Absence is flat, failure is loud.** No position for the market means
 *    `0n` — the honest baseline for an open. But an unreadable venue THROWS,
 *    because a read that failed is not the same as a position that is empty,
 *    and the gateway refuses to open into the difference.
 */
export declare function positionReaderFor(venue: PerpsVenue): PositionReader;
/**
 * Fan a single {@link PositionReader} out over several venues, keyed by
 * `PerpsVenue.id`. The gateway holds exactly one reader; this is how a
 * composition with two venues mounted still gives it one.
 */
export declare function positionReaderOver(venues: readonly PerpsVenue[]): PositionReader;
