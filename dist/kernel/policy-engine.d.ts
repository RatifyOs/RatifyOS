import type { PolicyConfig, TradeIntent } from "./contracts.js";
export interface GuardOptions {
    readonly dryRun: boolean;
    readonly confirmedByUser: boolean;
}
/**
 * Deterministic, side-effect-free guards that don't need network I/O. These are
 * sourced entirely from engine-owned policy + the intent's own claims; nothing
 * here trusts model output. Throws GuardError on the first failure.
 */
export declare function staticGuards(policy: PolicyConfig, intent: TradeIntent, opts: GuardOptions): void;
