import type { PolicyConfig } from "./contracts.js";
export interface PolicyOverrides {
    executionEnabled?: boolean;
    killSwitch?: boolean;
    maxSlippageBps?: number;
    capSolPerTrade?: number;
    capSolPerHour?: number;
    capSolPerDay?: number;
    capUsdcPerTrade?: number;
    capUsdcPerHour?: number;
    capUsdcPerDay?: number;
    mintAllowlist?: readonly string[] | null;
    mintDenylist?: readonly string[];
    allowToken2022?: boolean;
}
/** Conservative defaults: dry-run, 1% max slippage, 1 SOL / 200 USDC per trade. */
export declare function defaultPolicy(): PolicyConfig;
export declare function applyPolicyOverrides(base: PolicyConfig, o: PolicyOverrides): PolicyConfig;
