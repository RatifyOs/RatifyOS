import { type PumpPortalOptions } from "./pumpportal.js";
import { SignalsEngine } from "./signals-engine.js";
import { TradeTape } from "./tape.js";
/**
 * Tape + feed + heuristics as one mountable unit.
 *
 * The {@link SignalsEngine} it exposes is a {@link RugHeatSource} and exists
 * from construction, before any socket is opened. That ordering is the whole
 * point: the pools guards get a real, non-null reading immediately, and what
 * the running feed changes is whether that reading is INFORMED. An unstarted
 * feed reports 60/100 ("no trades in window") for every mint, which is at the
 * default `maxRugHeat` rejection threshold — so a dead feed refuses buys rather
 * than waving them through.
 *
 * `start()` is a network side effect and belongs to the application lifecycle,
 * never to a constructor.
 */
export interface SignalsFeedOptions {
    /** Overrides for the underlying watcher (URL, socket factory). */
    readonly watcher?: Omit<PumpPortalOptions, "onTrade" | "onNewToken">;
    /** Trades retained per mint. */
    readonly maxPerMint?: number;
    /**
     * How many freshly-launched mints to auto-follow. PumpPortal's new-token
     * stream is a firehose and each follow costs a subscription, so the newest
     * `maxAutoFollow` launches are tracked and older ones dropped. Explicitly
     * watched mints (see {@link SignalsFeed.watch}) are never evicted.
     */
    readonly maxAutoFollow?: number;
}
export declare class SignalsFeed {
    #private;
    constructor(options?: SignalsFeedOptions);
    /** The `RugHeatSource` to mount on the pools tools. Always present. */
    get engine(): SignalsEngine;
    get tape(): TradeTape;
    /** True while the socket is open — the console's "connected" light. */
    get connected(): boolean;
    get started(): boolean;
    /** Open the feed. Idempotent. */
    start(): void;
    /** Close the feed. The engine keeps answering off whatever the tape holds. */
    stop(): void;
    /**
     * Follow a specific mint for as long as the feed runs. Pinned: never evicted
     * by the auto-follow budget, because a mint someone is about to trade matters
     * more than the newest launch.
     */
    watch(mint: string): void;
    /** Mints currently subscribed on the socket. */
    watching(): string[];
}
