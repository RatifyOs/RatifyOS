#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { loadConfig } from "../config/index.js";
import { createApplication } from "../app/index.js";
import { SessionStore } from "../storage/session-store.js";
import { runCli } from "../cli/index.js";
import { createUserWorkflow, httpRpc } from "../cli/user-workflow.js";
import { join } from "node:path";
const VERSION = "0.1.0";
const HELP = "Usage: raos [--remote URL] [--token TOKEN] [--json] <setup|wallet|portfolio|trade|signer|status|sessions|tools|skills|markets|jobs|chat|simulate>\nSigning remains isolated in raos-signer.";
export async function resolveInputArgument(arg, stdin = async () => {
    const chunks = [];
    for await (const chunk of process.stdin)
        chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
}) {
    const raw = arg === "-"
        ? await stdin()
        : arg.startsWith("@")
            ? await readFile(arg.slice(1), "utf8")
            : arg;
    try {
        return JSON.parse(raw);
    }
    catch {
        throw Error("Invalid simulation JSON");
    }
}
function options(argv) {
    let remote, token = process.env.RAOS_API_TOKEN;
    const json = argv.includes("--json");
    const out = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--json")
            continue;
        if (argv[i] === "--remote") {
            remote = argv[++i];
            if (!remote)
                throw Error("--remote requires URL");
            continue;
        }
        if (argv[i] === "--token") {
            token = argv[++i];
            if (!token)
                throw Error("--token requires value");
            continue;
        }
        out.push(argv[i]);
    }
    return { args: out, remote, token, json };
}
async function localServices() {
    const config = loadConfig(process.env), app = createApplication(config);
    await app.start();
    const sessions = new SessionStore(config.paths.sessions);
    const listJobs = () => {
        const db = new DatabaseSync(config.paths.jobs);
        try {
            const exists = db
                .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='jobs'")
                .get();
            return exists
                ? db
                    .prepare("SELECT id,type,status,scheduled_at scheduledAt,attempt_count attemptCount,max_attempts maxAttempts FROM jobs ORDER BY created_at DESC LIMIT 100")
                    .all()
                : [];
        }
        finally {
            db.close();
        }
    };
    const t = app.trading, trading = t
        ? {
            quote: t.quote.bind(t),
            execute: t.execute.bind(t),
            revoke: t.revoke.bind(t),
            approve: t.approve.bind(t),
            deny: t.deny.bind(t),
            submit: t.submit.bind(t),
            status: t.status.bind(t),
            reconcile: t.reconcile.bind(t),
            portfolio: async () => {
                if (!config.rpc || !config.trading)
                    throw Error("trading not configured");
                // Lamports, read as a bigint out of the RPC context envelope.
                const balance = await httpRpc(config.rpc.url, "getBalance", [
                    config.trading.account,
                    { commitment: "confirmed" },
                ]);
                return {
                    address: config.trading.account,
                    nativeBalance: BigInt(balance?.value ?? balance ?? 0).toString(),
                };
            },
        }
        : undefined;
    const services = {
        status: () => app.health(),
        sessions: () => sessions.listUnfinishedRuns(),
        tools: () => app.registry.listPrivileged().map((x) => ({
            name: x.name,
            description: x.description,
            effect: x.effect,
        })),
        skills: async () => {
            try {
                return (await readdir(config.paths.skills, { withFileTypes: true }))
                    .filter((x) => x.isDirectory() || x.isFile())
                    .map((x) => x.name);
            }
            catch {
                return [];
            }
        },
        markets: () => app.registry
            .listPrivileged()
            .filter((x) => x.name.startsWith("market."))
            .map((x) => x.name),
        jobs: listJobs,
        user: createUserWorkflow({
            dataDir: config.dataDir,
            ...(trading ? { trading } : {}),
        }),
        chat: async (x) => {
            let reply;
            for await (const event of app.runtime.run({
                messages: [{ role: "user", content: x.message }],
            })) {
                if (event.type === "run.failed")
                    throw Error(event.error.message);
                if (event.type === "run.completed")
                    reply = event.message.content;
            }
            return reply;
        },
        simulate: (x) => app.registry.invoke("simulation.transaction", x, {
            capabilities: ["order:simulate"],
        }),
    };
    return {
        services,
        close: async () => {
            sessions.close();
            await app.stop();
        },
    };
}
export function createRemoteServices(base, token, fetchFn = fetch, dataDir = process.env.DATA_DIR ?? join(process.env.HOME ?? ".", ".raos")) {
    const call = async (path, init = {}) => {
        const headers = {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        };
        const r = await fetchFn(new URL(path, base.endsWith("/") ? base : `${base}/`), { ...init, headers: { ...headers, ...init.headers } });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
            const error = body.error;
            throw Error(typeof error === "string"
                ? error
                : (error?.message ?? `API request failed (${r.status})`));
        }
        return body;
    };
    const trading = {
        quote: (x) => call("v1/trading/quote", {
            method: "POST",
            body: JSON.stringify(x, (_k, v) => typeof v === "bigint" ? v.toString() : v),
        }),
        execute: (quoteId, x) => call("v1/trading/execute", {
            method: "POST",
            headers: { "idempotency-key": x.idempotencyKey },
            body: JSON.stringify({ quoteId, dryRun: x.dryRun }),
        }),
        revoke: (token, x) => call("v1/trading/revoke", {
            method: "POST",
            headers: { "idempotency-key": x.idempotencyKey },
            body: JSON.stringify({ token, dryRun: x.dryRun }),
        }),
        approve: (id, _operator, x) => call(`v1/trading/executions/${id}/approve`, {
            method: "POST",
            headers: { "idempotency-key": randomUUID() },
            body: JSON.stringify(x),
        }),
        deny: async () => {
            throw Error("remote denial endpoint unavailable");
        },
        submit: (id) => call(`v1/trading/executions/${id}/submit`, {
            method: "POST",
            headers: { "idempotency-key": randomUUID() },
        }),
        status: (id) => call(`v1/trading/executions/${id}`),
        reconcile: () => call("v1/trading/reconcile", { method: "POST" }),
    };
    return {
        status: () => call("v1/health"),
        sessions: () => call("v1/sessions"),
        tools: () => call("v1/tools"),
        skills: () => call("v1/skills"),
        markets: () => call("v1/markets"),
        jobs: () => call("v1/jobs"),
        chat: (x) => call("v1/chat", { method: "POST", body: JSON.stringify(x) }),
        simulate: (x) => call("v1/simulate", { method: "POST", body: JSON.stringify(x) }),
        user: createUserWorkflow({ dataDir, trading: trading }),
    };
}
export async function main(argv = process.argv.slice(2)) {
    if (argv.includes("--help") || argv.length === 0) {
        console.log(HELP);
        return 0;
    }
    if (argv.includes("--version")) {
        console.log(VERSION);
        return 0;
    }
    const o = options(argv);
    if (o.args[0] === "simulate" && o.args[1])
        o.args[1] = JSON.stringify(await resolveInputArgument(o.args[1]));
    if (o.remote)
        return runCli(o.args, createRemoteServices(o.remote, o.token));
    const local = await localServices();
    try {
        return await runCli(o.args, local.services);
    }
    finally {
        await local.close();
    }
}
if (process.argv[1]) {
    let invoked;
    try {
        invoked = realpathSync(process.argv[1]);
    }
    catch { }
    if (invoked === fileURLToPath(import.meta.url))
        main()
            .then((code) => {
            process.exitCode = code;
        })
            .catch((error) => {
            console.error(JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : "CLI failed",
            }));
            process.exitCode = 1;
        });
}
