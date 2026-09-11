import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
const safe = (v) => {
    if (Array.isArray(v))
        return v.map(safe);
    if (v && typeof v === "object")
        return Object.fromEntries(Object.entries(v)
            .filter(([k]) => !/(raw.?transaction|signing|private.?key)/i.test(k))
            .map(([k, x]) => [k, safe(x)]));
    return v;
};
export class MemoryRunStore {
    retention;
    runs = new Map();
    keys = new Map();
    constructor(retention = 100) {
        this.retention = retention;
    }
    create(r, key) {
        this.runs.set(r.id, r);
        if (key)
            this.keys.set(`${r.tenantId}:${key}`, r.id);
        return r;
    }
    idempotent(tenant, key) {
        const id = this.keys.get(`${tenant}:${key}`);
        return id ? this.runs.get(id) : undefined;
    }
    get(id, tenant) {
        const r = this.runs.get(id);
        return r?.tenantId === tenant ? r : undefined;
    }
    emit(id, type, data) {
        const r = this.runs.get(id);
        if (!r)
            return;
        const event = {
            id: (r.events.at(-1)?.id ?? 0) + 1,
            type,
            data: safe(data),
        };
        r.events.push(event);
        if (r.events.length > this.retention)
            r.events.splice(0, r.events.length - this.retention);
    }
    active(tenant) {
        return [...this.runs.values()].filter((r) => r.tenantId === tenant && r.status === "running").length;
    }
}
export function createAgentApi(c) {
    const app = Fastify({ logger: false, bodyLimit: c.bodyLimit ?? 1048576 });
    void app.register(cors, { origin: c.corsOrigin ?? false });
    app.setErrorHandler((e, _q, r) => {
        const status = e.statusCode === 413 ? 413 : e.validation ? 400 : 500;
        r.code(status).send({
            error: {
                code: status === 413
                    ? "PAYLOAD_TOO_LARGE"
                    : status === 400
                        ? "VALIDATION_ERROR"
                        : "INTERNAL_ERROR",
                message: status === 500 ? "Unexpected server error" : "Request rejected",
                details: e.validation,
            },
        });
    });
    app.decorateRequest("principal", null);
    app.addHook("onRequest", async (q, r) => {
        const p = await c.authenticate(String(q.headers.authorization ?? ""));
        if (!p)
            return r.code(401).send({
                error: { code: "UNAUTHORIZED", message: "Authentication required" },
            });
        q.principal = p;
    });
    const p = (q) => q.principal;
    const err = (r, n, code, message) => r.code(n).send({ error: { code, message } });
    app.post("/v1/runs", {
        schema: {
            body: {
                type: "object",
                required: ["sessionId", "input"],
                properties: {
                    sessionId: { type: "string", minLength: 1 },
                    input: { type: "string", minLength: 1 },
                },
                additionalProperties: false,
            },
        },
    }, async (q, r) => {
        const who = p(q);
        if (!who.scopes.includes("agent:write"))
            return err(r, 403, "FORBIDDEN", "Missing scope");
        const key = String(q.headers["idempotency-key"] ?? "");
        if (key) {
            const old = c.store.idempotent(who.tenantId, key);
            if (old)
                return r.code(202).send(publicRun(old));
        }
        if (c.store.active(who.tenantId) >= (c.maxConcurrentRuns ?? 10))
            return err(r, 429, "QUOTA_EXCEEDED", "Concurrent run quota exceeded");
        const run = c.store.create({
            id: randomUUID(),
            tenantId: who.tenantId,
            subject: who.subject,
            sessionId: q.body.sessionId,
            status: "running",
            createdAt: Date.now(),
            events: [],
        }, key || undefined);
        queueMicrotask(async () => {
            try {
                await c.runtime.start(q.body, {
                    runId: run.id,
                    tenantId: who.tenantId,
                    emit: (t, d) => c.store.emit(run.id, t, d),
                });
                if (run.status === "running")
                    run.status = "completed";
            }
            catch (e) {
                run.status = "failed";
                c.store.emit(run.id, "error", {
                    message: e instanceof Error ? e.message : "run failed",
                });
            }
        });
        return r.code(202).send(publicRun(run));
    });
    app.get("/v1/runs/:id", async (q, r) => {
        const x = c.store.get(q.params.id, p(q).tenantId);
        return x ? publicRun(x) : err(r, 404, "NOT_FOUND", "Run not found");
    });
    app.get("/v1/runs/:id/events", async (q, r) => {
        const x = c.store.get(q.params.id, p(q).tenantId);
        if (!x)
            return err(r, 404, "NOT_FOUND", "Run not found");
        const last = Number(q.headers["last-event-id"] ?? 0);
        const body = x.events
            .filter((e) => e.id > last)
            .map((e) => `id: ${e.id}\nevent: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`)
            .join("");
        return r
            .header("content-type", "text/event-stream; charset=utf-8")
            .header("cache-control", "no-cache")
            .send(body);
    });
    app.post("/v1/runs/:id/cancel", async (q, r) => {
        const who = p(q), admin = who.scopes.includes("agent:admin");
        if (!admin && !who.scopes.includes("agent:cancel"))
            return err(r, 403, "FORBIDDEN", "Missing scope");
        const x = c.store.get(q.params.id, who.tenantId);
        if (!x)
            return err(r, 404, "NOT_FOUND", "Run not found");
        if (!admin && x.subject !== who.subject)
            return err(r, 403, "FORBIDDEN", "Run ownership required");
        await c.runtime.cancel(x.id, x.tenantId);
        x.status = "cancelled";
        c.store.emit(x.id, "cancelled", {});
        return publicRun(x);
    });
    app.get("/v1/sessions/search", async (q) => ({
        items: await c.adapters.sessions.search(String(q.query.q ?? ""), p(q).tenantId),
    }));
    app.get("/v1/sessions/:id", async (q, r) => (await c.adapters.sessions.get(q.params.id, p(q).tenantId)) ??
        err(r, 404, "NOT_FOUND", "Session not found"));
    app.get("/v1/approvals/:id", async (q, r) => (await c.adapters.approvals.get(q.params.id, p(q).tenantId)) ??
        err(r, 404, "NOT_FOUND", "Approval not found"));
    for (const [path, d] of [
        ["approve", "approved"],
        ["deny", "denied"],
    ])
        app.post(`/v1/approvals/:id/${path}`, async (q, r) => p(q).scopes.includes("approval:decide")
            ? c.adapters.approvals.decide(q.params.id, d, p(q).tenantId, p(q).subject)
            : err(r, 403, "FORBIDDEN", "Missing scope"));
    app.get("/v1/health", async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
        dependencies: {
            runtime: await c.runtime.health(),
            runStore: { status: "ok" },
        },
    }));
    return app;
}
function publicRun(r) {
    return {
        id: r.id,
        sessionId: r.sessionId,
        status: r.status,
        createdAt: r.createdAt,
    };
}
