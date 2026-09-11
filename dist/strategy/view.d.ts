import type { StrategyView } from "../control/view.js";
import type { StrategyRow } from "./store.js";
/**
 * Project one strategy row onto the console's view model.
 *
 * The rule from `src/control/snapshot.ts` applies here too: never invent a
 * number. `trigger` is null unless the strategy actually has a price target and
 * a live reading to compare it against, and `budget` is null unless a budget
 * was set — a zero-of-zero meter reads as "spent nothing of nothing", which is
 * not what "no budget configured" means.
 */
export declare function strategyView(row: StrategyRow): StrategyView;
/** The mint a strategy trades, when it names one. Used to warm the trade tape. */
export declare function strategyMint(row: StrategyRow): string | undefined;
