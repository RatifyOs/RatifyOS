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
export class PolicyController {
    #policy;
    #enforced = false;
    #canArm;
    constructor(initial, options = {}) {
        this.#policy = initial;
        this.#canArm = options.canArm ?? initial.executionEnabled;
    }
    get() {
        return this.#policy;
    }
    /** True once a value-moving path re-reads this controller. */
    get enforced() {
        return this.#enforced;
    }
    /** True when the boot-time configuration permits arming execution at all. */
    get canArm() {
        return this.#canArm;
    }
    /** Called by the composition that wires this into a `TradeGateway`. */
    markEnforced() {
        this.#enforced = true;
    }
    setKillSwitch(engaged) {
        // Engaging a stop is always safe; releasing one that nothing reads is not.
        if (!engaged)
            this.#requireEnforced("release the kill switch");
        this.#policy = { ...this.#policy, killSwitch: engaged };
        return this.#policy;
    }
    setExecutionEnabled(enabled) {
        if (enabled) {
            this.#requireEnforced("arm execution");
            if (!this.#canArm)
                throw new PolicyControlError("EXECUTION_NOT_PERMITTED", "this process was not booted with live execution enabled; arm it in the environment (EXECUTION_MODE) and restart");
        }
        this.#policy = { ...this.#policy, executionEnabled: enabled };
        return this.#policy;
    }
    #requireEnforced(action) {
        if (this.#enforced)
            return;
        throw new PolicyControlError("POLICY_NOT_ENFORCED", `no money path is reading this policy, so it cannot ${action}; the kernel gateway is not composed (no wallet is mounted)`);
    }
}
export class PolicyControlError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "PolicyControlError";
        this.code = code;
    }
}
export function isPolicyControlError(e) {
    return e instanceof PolicyControlError;
}
