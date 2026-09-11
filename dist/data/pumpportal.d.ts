import type { TapeTrade } from "./tape.js";
/**
 * Live feed off PumpPortal's KEYLESS public WebSocket — no API key, no credits,
 * no account. Subscribes to new-token launches on connect, lets callers stream
 * per-token trades, and maps each raw message into a clean {@link TapeTrade}.
 *
 * Resilient by design: exponential-backoff reconnect with jitter, a
 * stale-message watchdog, and a never-throw message handler (a bad frame is
 * swallowed, not propagated). Every active subscription is re-sent on each
 * (re)connect, so a drop is transparent to callers.
 *
 * Nothing here is a safety control. The feed going quiet does not loosen a
 * guard: an empty tape scores 60 on rug-heat, which the pools default rejects.
 * A dead feed therefore means no curve buys, not unchecked ones.
 */
export declare const PUMPPORTAL_URL = "wss://pumpportal.fun/api/data";
/**
 * The slice of the WHATWG WebSocket this module uses.
 *
 * Declared structurally so tests can inject a fake socket without a network,
 * and so the module does not depend on `lib.dom` being in `types`.
 */
export interface FeedSocket {
    readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    addEventListener(type: "open", listener: () => void): void;
    addEventListener(type: "message", listener: (ev: {
        data: unknown;
    }) => void): void;
    addEventListener(type: "close", listener: () => void): void;
    addEventListener(type: "error", listener: (ev: unknown) => void): void;
}
/** How a socket gets created. Overridable so tests never open a real one. */
export type FeedSocketFactory = (url: string) => FeedSocket;
export interface PumpPortalOptions {
    readonly url?: string;
    readonly onTrade?: ((t: TapeTrade) => void) | undefined;
    readonly onNewToken?: ((mint: string, meta: unknown) => void) | undefined;
    /** Injected in tests; defaults to Node's global `WebSocket`. */
    readonly createSocket?: FeedSocketFactory | undefined;
}
export declare class PumpPortalWatcher {
    #private;
    constructor(opts?: PumpPortalOptions);
    /** True while a socket is open. The console reports this as feed liveness. */
    get connected(): boolean;
    /** Epoch ms of the last frame received, or 0 if none ever arrived. */
    get lastMessageAt(): number;
    /** Open the socket and begin streaming. Idempotent while already connected. */
    start(): void;
    /** Tear everything down: no more reconnects, watchdog cleared, socket closed. */
    stop(): void;
    /** Subscribe to live trades for a mint. Safe to call before the socket opens. */
    subscribeTokenTrade(mint: string): void;
    /** Stop receiving trades for a mint. */
    unsubscribeTokenTrade(mint: string): void;
    /** Mints this watcher is currently subscribed to. */
    subscriptions(): string[];
}
