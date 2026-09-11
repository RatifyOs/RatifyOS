/**
 * Authentication for the operator console.
 *
 * ─── the shape of the problem ───────────────────────────────────────────────
 *
 * The dashboard is a static bundle this daemon serves from its own origin. It
 * has no login screen and no token store: `web/src/data/http-source.ts` calls
 * `fetch(..., { credentials: 'same-origin' })` and
 * `new EventSource(url, { withCredentials: true })`. Both send COOKIES and
 * neither can attach an `Authorization` header. So the console authenticates
 * with a **same-origin session cookie**, minted by exchanging the daemon's
 * existing API bearer token exactly once at `POST /api/session`.
 *
 * Nothing about the existing bearer scheme changes: `API_BEARER_TOKEN` /
 * `API_BEARER_TOKEN_SHA256` remains the only credential, `API_SCOPES` remains
 * the only authority, and every API route also accepts a plain
 * `Authorization: Bearer` header so curl and the CLI work unchanged.
 *
 * ─── fail-closed ────────────────────────────────────────────────────────────
 *
 * With no bearer token configured, {@link ControlAuth.configured} is false, no
 * session can ever be minted, and EVERY control-plane route — the approvals
 * decision endpoint above all — answers 401 `AUTH_NOT_CONFIGURED`. There is no
 * "development mode" that opens it, and no way to reach the money path from a
 * browser that has not presented the operator's token.
 *
 * ─── CSRF ───────────────────────────────────────────────────────────────────
 *
 * Cookie auth means cross-site requests would otherwise ride along. Three
 * independent barriers, any one of which is sufficient:
 *
 *   1. `SameSite=Strict` — the browser will not attach the cookie to a request
 *      initiated by another site at all.
 *   2. Mutating routes require `content-type: application/json`, which a plain
 *      cross-origin HTML form cannot send without a CORS preflight.
 *   3. `Origin` / `Sec-Fetch-Site`, when present, must be same-origin.
 *
 * `@fastify/cors` is deliberately NOT registered on this surface, so no
 * cross-origin preflight can ever succeed either.
 */
export declare const SESSION_COOKIE = "ari_session";
export interface ControlAuthOptions {
    readonly bearerToken?: string | undefined;
    readonly bearerTokenSha256?: string | undefined;
    readonly scopes: readonly string[];
    readonly sessionTtlMs?: number;
    /** Force the `Secure` cookie attribute even for plaintext requests. */
    readonly secureCookies?: boolean;
    readonly now?: () => number;
}
export type ControlIdentity = {
    readonly via: "session" | "bearer";
    readonly scopes: readonly string[];
};
export declare class ControlAuth {
    #private;
    constructor(options: ControlAuthOptions);
    /** False when no credential is configured — every route then refuses. */
    get configured(): boolean;
    get scopes(): readonly string[];
    hasScope(scope: string): boolean;
    /** Constant-time check of a raw bearer token against the configured one. */
    verifyToken(token: string): boolean;
    verifyAuthorizationHeader(header: string | undefined): boolean;
    /** Mint a session. Callers MUST have verified the bearer token first. */
    createSession(): {
        id: string;
        expiresAt: number;
    };
    verifySession(id: string | undefined): boolean;
    revokeSession(id: string | undefined): void;
    cookie(id: string, secure: boolean): string;
    clearedCookie(secure: boolean): string;
}
/** Minimal RFC 6265 cookie-header parse — avoids a plugin for one cookie. */
export declare function readCookie(header: string | undefined, name: string): string | undefined;
/**
 * True when a request either did not come from a browser page context, or came
 * from this very origin. Used only as CSRF depth — `SameSite=Strict` is the
 * primary control.
 */
export declare function isSameOrigin(headers: {
    origin?: string | undefined;
    host?: string | undefined;
    secFetchSite?: string | undefined;
}): boolean;
