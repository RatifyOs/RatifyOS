import type { Preview, ToolContext, ToolOutcome } from "../../kernel/contracts.js";
import { type PerpGuardVerdict } from "../guards.js";
import { type PerpIntent } from "../intent.js";
import type { FundingRate } from "../types.js";
import { type PerpsToolDeps, type PerpsSnapshot } from "./deps.js";
/**
 * The shared tail of every proposing perps tool.
 *
 * THE INVARIANT, in one place: these tools build an intent and stop. There is no
 * call to `ctx.gateway.execute()` anywhere in this package, no signer, no
 * broadcaster, and no keypair. `execute()` returns the same artifact
 * `simulate()` does — a proposal — because for perps there is nothing else a
 * tool is allowed to do.
 *
 * A second reason it stops here, specific to perps: `TradeGateway` settles by
 * wallet balance delta, which cannot verify a perp fill (see the `PerpIntent`
 * doc comment). Routing a perp intent through it today would produce a
 * misleading settle even if `staticGuards` accepted the kind — which it does
 * not. So the tool hands the intent back and the engine decides, with a human in
 * the loop, what to do with it.
 */
export interface PerpProposal {
    readonly kind: "perp_proposal";
    readonly intent: PerpIntent;
    readonly verdict: PerpGuardVerdict;
    readonly warnings: readonly string[];
    /** Always false. Present so a caller can assert on it rather than infer it. */
    readonly executed: false;
}
export declare function proposalPreview(proposal: PerpProposal): Preview;
export declare function proposalResult(proposal: PerpProposal): ToolOutcome;
export declare function renderProposal(proposal: PerpProposal): string;
export declare function makeProposal(deps: PerpsToolDeps, snapshot: PerpsSnapshot, intent: PerpIntent, venueWarnings: readonly string[], dryRun: boolean): PerpProposal;
/**
 * Funding is fetched separately and is allowed to fail — but the failure is
 * carried as `undefined`, never as zero. `fundingSane` refuses an opening intent
 * with no reading, so a funding outage becomes a refusal rather than a blind
 * trade.
 */
export declare function readFunding(deps: PerpsToolDeps, symbol: string): Promise<{
    funding: FundingRate | undefined;
    warning: string | undefined;
}>;
export declare function ctxUnused(_ctx: ToolContext): void;
