/**
 * The control plane: the daemon serves its own operator console.
 *
 * One process. `node dist/server.js` and the operator has the dashboard at `/`
 * and its API at `/api` on the same origin — no second deployment, no CORS, no
 * separate static host that can drift out of step with the kernel it controls.
 *
 * ─── the six routes ─────────────────────────────────────────────────────────
 *
 * The contract is documented at the top of `web/src/data/http-source.ts` and
 * this module implements exactly it:
 *
 *   GET  /api/snapshot                 → DashboardSnapshot
 *   GET  /api/stream                   → text/event-stream of DashboardSnapshot
 *   POST /api/approvals/:id/decide     { decision: 'approve' | 'reject' }
 *   POST /api/policy/kill-switch       { engaged: boolean }
 *   POST /api/policy/execution         { enabled: boolean }
 *   POST /api/strategies/:id/status    { status: StrategyStatus }
 *
 * Plus `POST|DELETE|GET /api/session`, which is how a browser that cannot set
 * an `Authorization` header gets authenticated at all — see `./auth.ts`.
 *
 * ─── what is real ───────────────────────────────────────────────────────────
 *
 * `./snapshot.ts` documents, field by field, which panels are read from the
 * kernel and which report an explicit unavailable state because no source for
 * them exists in this repo yet. `GET /api/sources` returns that same map on the
 * wire so an operator never has to guess whether a zero is a measurement.
 *
 * The approvals route is mounted, authenticated and scope-checked, and then
 * refuses with `APPROVALS_UNAVAILABLE` — the kernel has no pending-approval
 * queue to decide against. It is NOT an open endpoint waiting for a queue.
 */
import type { FastifyInstance } from "fastify";
import { ControlAuth } from "./auth.js";
import type { ControlAuthOptions } from "./auth.js";
import type { ControlRuntime } from "./snapshot.js";
export { ControlAuth, SESSION_COOKIE } from "./auth.js";
export type { ControlAuthOptions } from "./auth.js";
export { PolicyController, isPolicyControlError } from "./policy.js";
export { buildSnapshot, snapshotSources } from "./snapshot.js";
export type { ControlRuntime, SnapshotSources } from "./snapshot.js";
export * from "./view.js";
/** Scopes the console needs. Read is separate from anything that moves value. */
export declare const CONTROL_SCOPES: {
    readonly read: "agent:read";
    readonly policy: "trading:execute";
    readonly approve: "trading:approve";
};
/**
 * The Content-Security-Policy the console is served under.
 *
 * `default-src 'self'` with no external host anywhere: the dashboard, its
 * fonts, its API and its event stream are all this origin. Two deliberate
 * relaxations, neither of which admits a third party:
 *
 *  · `img-src 'self' data:` — `web/src/styles/base.css` embeds its film-grain
 *    as an inline `data:image/svg+xml` URI, and CSS `url(data:)` in a
 *    `background-image` is governed by `img-src`.
 *  · `style-src 'self' 'unsafe-inline'` — the React views set computed geometry
 *    through `style={{ width: … }}` props (cap meters, liquidation bars,
 *    countdown fills) in ~40 places, and CSP treats a `style` ATTRIBUTE as
 *    inline style. Removing this means removing those props from `web/src`,
 *    which is a UI change, not a server one. **`script-src` gets no such
 *    exception** — the executable surface stays `'self'` only, which is the
 *    half that matters for XSS.
 *
 * `font-src 'self' data:` is redundant against `default-src` today; it is
 * stated so that self-hosted fonts — including base64 `data:` faces inlined by
 * the bundler — keep working without anyone reaching for a CDN exception.
 */
export declare const CONTENT_SECURITY_POLICY: string;
export interface ControlPlaneOptions {
    readonly runtime: ControlRuntime;
    readonly auth: ControlAuth | ControlAuthOptions;
    /** Directory holding the built dashboard. Defaults to `<package>/web/dist`. */
    readonly webRoot?: string;
    readonly apiPrefix?: string;
    readonly streamIntervalMs?: number;
}
export declare function defaultWebRoot(): string;
/**
 * Mount the console and its API on an existing Fastify instance.
 *
 * Registration order does not matter to find-my-way — an exact route always
 * beats the static plugin's wildcard — but the SPA fallback is deliberately a
 * not-found handler rather than a `GET /*` route, so it can only ever run once
 * every real route has declined.
 */
export declare function registerControlPlane(app: FastifyInstance, options: ControlPlaneOptions): FastifyInstance;
/** Exposed for tests and tooling that want the shell without a running app. */
export declare function readDashboardShell(webRoot?: string): import("fs").ReadStream | undefined;
