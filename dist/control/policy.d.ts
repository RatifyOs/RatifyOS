import type { PolicyConfig } from "../kernel/contracts.js";
/**
 * The live handle on the kernel's `PolicyConfig`.
 *
 * `TradeGatewayImpl` takes `policy: () => PolicyConfig` and re-reads it at the
 * metal on every execute, so handing it {@link PolicyController.get} — rather
 * than a frozen object — is what makes the console's kill switch and dry-run
 * toggle real instead of decorative.
 *
 * Two invariants keep the console from being a privilege-escalation path:
 *
 *  1. **Boot-time opt-in is the ceiling.** `EXECUTION_MODE=live` requires a
 *     documented triple opt-in in `src/config/`. A browser session must never
 *     be able to reach past that, so `setExecutionEnabled(true)` is refused
 *     unless the process was booted live-enabled. Disarming is always allowed:
 *     the console can only ever *reduce* authority.
 *  2. **A policy nothing enforces cannot be toggled.** Until a
 *     {@link markEnforced} caller has wired this controller into a gateway,
 *     every mutation is refused. An operator pressing a kill switch that no
 *     money path reads would get false assurance, which is worse than an error.
 */
export declare class PolicyController {
    #private;
    constructor(initial: PolicyConfig, options?: {
        canArm?: boolean;
    });
    get(): PolicyConfig;
    /** True once a value-moving path re-reads this controller. */
    get enforced(): boolean;
    /** True when the boot-time configuration permits arming execution at all. */
    get canArm(): boolean;
    /** Called by the composition that wires this into a `TradeGateway`. */
    markEnforced(): void;
    setKillSwitch(engaged: boolean): PolicyConfig;
    setExecutionEnabled(enabled: boolean): PolicyConfig;
}
export type PolicyControlCode = "POLICY_NOT_ENFORCED" | "EXECUTION_NOT_PERMITTED";
export declare class PolicyControlError extends Error {
    readonly code: PolicyControlCode;
    constructor(code: PolicyControlCode, message: string);
}
export declare function isPolicyControlError(e: unknown): e is PolicyControlError;
