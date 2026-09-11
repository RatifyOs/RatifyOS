import type { Clock, Confirmer } from "./contracts.js";
import type { KernelStore } from "./store.js";
export interface ReconcilerDeps {
    readonly store: KernelStore;
    readonly confirmer: Confirmer;
    readonly clock: Clock;
}
export interface ReconcileSummary {
    readonly checked: number;
    readonly confirmed: number;
    readonly failed: number;
}
/**
 * Boot-time crash recovery. If the process died after broadcast but before the
 * confirm resolved, a trade is left in 'sent'. We re-check it ONCE against the
 * chain — never re-signing or re-broadcasting (that is how you double-spend):
 * if it confirmed, consume the reservation; otherwise release it and mark the
 * trade terminal. Recent-blockhash expiry is terminal by construction.
 */
export declare class Reconciler {
    #private;
    constructor(deps: ReconcilerDeps);
    recover(): Promise<ReconcileSummary>;
}
