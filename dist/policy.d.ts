import type { SwapIntent } from "./intent.js";
export interface Policy {
    now: number;
    maxAmountIn: bigint;
    maxSlippageBps: number;
    allowedTokens: ReadonlySet<string>;
}
export interface PolicyDecision {
    allowed: boolean;
    reasons: string[];
}
export declare function evaluatePolicy(intent: SwapIntent, policy: Policy): PolicyDecision;
