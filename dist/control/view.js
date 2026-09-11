/**
 * The SERVER half of the dashboard view-model contract.
 *
 * `web/src/data/types.ts` is the browser half, and its header explains why the
 * two mirror rather than share: `web/` is its own npm package with its own
 * dependency budget, and the kernel's contracts carry `bigint`, node types and
 * Solana SDK imports that have no business in a browser bundle.
 *
 * This file is the third copy of that shape and the only one the server can
 * typecheck against, so the same warning applies twice over: NOTHING ENFORCES
 * THIS MIRROR. When you touch `src/kernel/contracts.ts`, come here AND to
 * `web/src/data/types.ts`. `tests/control-plane.test.ts` at least pins the
 * wire-level field names a rendered snapshot must carry.
 *
 * MONEY RULE (identical to the browser half): token quantities are never
 * `number`. They are base-unit integers carried as decimal strings, paired with
 * `decimals`. Only USD estimates — already lossy — are `number`.
 *
 * Reconciled against `web/src/data/types.ts` on 2026-08-21.
 */
export const STRATEGY_STATUSES = [
    "active",
    "paused",
    "done",
    "errored",
];
