export class DelegationError extends Error {
    constructor(message) {
        super(message);
        this.name = "DelegationError";
    }
}
const defaults = {
    maxDepth: 2,
    maxChildren: 4,
    maxIterations: 8,
    deadlineMs: 30_000,
    maxCostUsd: 1,
    concurrency: 2,
};
const defaultCapabilities = [
    { name: "market:read", effect: "read" },
];
const terminal = (s) => s === "completed" || s === "failed" || s === "cancelled";
const errorText = (e) => (e instanceof Error ? e.message : String(e));
function deepFreeze(v, seen = new WeakSet()) {
    if (v && typeof v === "object" && !seen.has(v)) {
        seen.add(v);
        for (const x of Object.values(v))
            deepFreeze(x, seen);
        Object.freeze(v);
    }
    return v;
}
function boundary(v, label) {
    if (v === undefined || v === null)
        return v;
    try {
        return deepFreeze(structuredClone(v));
    }
    catch {
        throw new DelegationError(`${label} must be cloneable`);
    }
}
export class DelegationManager {
    #options;
    #limits;
    #allowed;
    #queue = [];
    #entries = new Map();
    #counts = new Map();
    #active = 0;
    #sequence = 0;
    constructor(options) {
        this.#options = options;
        this.#limits = { ...defaults, ...options.limits };
        for (const [k, v] of Object.entries(this.#limits))
            if (!Number.isFinite(v) || v <= 0)
                throw new DelegationError(`${k} must be positive`);
        const grants = options.capabilities ?? defaultCapabilities;
        if (grants.some((g) => g.effect !== "read"))
            throw new DelegationError("delegated capabilities must be read-only");
        this.#allowed = new Set(grants.map((g) => g.name));
    }
    spawn(request) {
        const depth = (request.depth ?? 0) + 1;
        if (depth > this.#limits.maxDepth)
            throw new DelegationError("maximum delegation depth exceeded");
        const count = this.#counts.get(request.parentSessionId) ?? 0;
        if (count >= this.#limits.maxChildren)
            throw new DelegationError("maximum children exceeded");
        const capabilities = request.requestedCapabilities.filter((c) => request.parentCapabilities.includes(c) && this.#allowed.has(c));
        if (!capabilities.length)
            throw new DelegationError("no permitted read-only capabilities");
        const safeRequest = {
            ...request,
            context: boundary(request.context, "context"),
            model: boundary(request.model, "model"),
            parentCapabilities: boundary([...request.parentCapabilities], "capabilities"),
            requestedCapabilities: boundary(capabilities, "capabilities"),
        };
        const id = `${request.parentSessionId}:child:${++this.#sequence}`;
        let resolve;
        const result = new Promise((r) => (resolve = r));
        const entry = {
            request: safeRequest,
            id,
            depth,
            status: "queued",
            controller: new AbortController(),
            resolve,
            settled: false,
            counted: true,
        };
        this.#entries.set(id, entry);
        this.#counts.set(request.parentSessionId, count + 1);
        this.#queue.push(entry);
        queueMicrotask(() => this.#drain());
        return {
            sessionId: id,
            get status() {
                return entry.status;
            },
            result,
            cancel: (r) => this.#cancel(entry, r ?? "cancelled"),
        };
    }
    cancelParent(parent, reason = "parent cancelled") {
        const visit = (p) => {
            for (const e of this.#entries.values())
                if (e.request.parentSessionId === p && !terminal(e.status)) {
                    visit(e.id);
                    this.#cancel(e, reason);
                }
        };
        visit(parent);
    }
    #cancel(e, reason) {
        if (terminal(e.status))
            return;
        e.controller.abort(reason);
        if (e.status === "queued") {
            const i = this.#queue.indexOf(e);
            if (i >= 0)
                this.#queue.splice(i, 1);
            void this.#finish(e, { status: "cancelled", error: errorText(reason) });
        }
    }
    #drain() {
        while (this.#active < this.#limits.concurrency && this.#queue.length) {
            const e = this.#queue.shift();
            if (e.status === "queued")
                void this.#run(e);
        }
    }
    async #run(e) {
        this.#active++;
        e.status = "running";
        const deadline = Date.now() + this.#limits.deadlineMs;
        let timer;
        try {
            const abort = new Promise((_, reject) => {
                const fail = () => reject(e.controller.signal.reason ?? "cancelled");
                e.controller.signal.addEventListener("abort", fail, { once: true });
                timer = setTimeout(() => e.controller.abort("deadline exceeded"), this.#limits.deadlineMs);
            });
            const runtime = this.#options.runtimeFactory({
                sessionId: e.id,
                parentSessionId: e.request.parentSessionId,
                depth: e.depth,
            });
            const input = Object.freeze({
                task: e.request.task,
                sessionId: e.id,
                context: e.request.context,
                model: e.request.model,
                capabilities: e.request.requestedCapabilities,
                maxIterations: this.#limits.maxIterations,
                deadline,
                signal: e.controller.signal,
                metadata: deepFreeze({
                    parentSessionId: e.request.parentSessionId,
                    depth: e.depth,
                }),
            });
            const run = Promise.resolve().then(() => runtime.run(input));
            run.catch(() => { });
            const raw = await Promise.race([run, abort]);
            if (e.controller.signal.aborted)
                throw e.controller.signal.reason;
            if (!raw ||
                typeof raw.summary !== "string" ||
                !raw.summary.trim() ||
                !Number.isInteger(raw.iterations) ||
                raw.iterations < 0 ||
                !Number.isFinite(raw.costUsd) ||
                raw.costUsd < 0)
                throw new DelegationError("invalid runtime result");
            if (raw.iterations > this.#limits.maxIterations ||
                raw.costUsd > this.#limits.maxCostUsd)
                await this.#finish(e, { status: "failed", error: "budget exceeded" });
            else {
                const safe = boundary(raw, "runtime result");
                if (this.#options.verifyResult) {
                    try {
                        const timeout = this.#options.verifierTimeoutMs ?? this.#limits.deadlineMs;
                        const ok = await Promise.race([
                            this.#options.verifyResult(safe, {
                                sessionId: e.id,
                                parentSessionId: e.request.parentSessionId,
                            }),
                            new Promise((_, r) => setTimeout(() => r(new Error("verifier timeout")), timeout)),
                        ]);
                        if (!ok) {
                            await this.#finish(e, {
                                status: "failed",
                                error: "result verification failed",
                            });
                            return;
                        }
                    }
                    catch (x) {
                        await this.#finish(e, {
                            status: "failed",
                            error: `verifier error: ${errorText(x)}`,
                        });
                        return;
                    }
                }
                await this.#finish(e, {
                    status: "completed",
                    summary: safe.summary,
                    details: safe.details,
                    iterations: safe.iterations,
                    costUsd: safe.costUsd,
                }, true);
            }
        }
        catch (x) {
            await this.#finish(e, {
                status: e.controller.signal.aborted ? "cancelled" : "failed",
                error: e.controller.signal.aborted
                    ? errorText(e.controller.signal.reason)
                    : errorText(x),
            });
        }
        finally {
            clearTimeout(timer);
            this.#active--;
            this.#drain();
        }
    }
    async #finish(e, partial, announce = false) {
        if (e.settled)
            return;
        e.settled = true;
        e.status = partial.status;
        if (e.counted) {
            e.counted = false;
            this.#counts.set(e.request.parentSessionId, Math.max(0, (this.#counts.get(e.request.parentSessionId) ?? 1) - 1));
        }
        const result = {
            sessionId: e.id,
            parentSessionId: e.request.parentSessionId,
            ...partial,
            announced: false,
            archived: false,
        };
        const errors = [];
        if (announce)
            try {
                await this.#options.announce?.(boundary(result, "announce result"));
                result.announced = true;
            }
            catch (x) {
                errors.push(errorText(x));
            }
        try {
            await this.#options.archive?.(boundary(result, "archive result"));
            result.archived = true;
        }
        catch (x) {
            errors.push(errorText(x));
        }
        if (errors.length)
            result.error = [partial.error, ...errors].filter(Boolean).join("; ");
        e.resolve(boundary(result, "delegation result"));
    }
    authorizeDispatch(sessionId, capability) {
        const e = this.#entries.get(sessionId);
        return (!!e &&
            e.request.requestedCapabilities.includes(capability) &&
            this.#allowed.has(capability) &&
            (this.#options.capabilityEnforcer?.authorize(capability, {
                sessionId,
                parentSessionId: e.request.parentSessionId,
            }) ??
                true));
    }
}
