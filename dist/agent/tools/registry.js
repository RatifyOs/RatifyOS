import { zodToJsonSchema } from "zod-to-json-schema";
export class ToolRegistry {
    #tools = new Map();
    #toolsets = new Map();
    #audit;
    #defaultTimeoutMs;
    #sequence = 0;
    constructor(options = {}) {
        this.#audit = options.audit;
        this.#defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
    }
    register(tool) {
        if (this.#tools.has(tool.name))
            throw new Error(`Tool already registered: ${tool.name}`);
        this.#tools.set(tool.name, tool);
        return this;
    }
    defineToolset(name, tools) {
        for (const tool of tools)
            if (!this.#tools.has(tool))
                throw new Error(`Unknown tool: ${tool}`);
        this.#toolsets.set(name, [...tools]);
        return this;
    }
    list(filter = {}) {
        return this.#list(filter, false);
    }
    listPrivileged(filter = {}) {
        return this.#list(filter, true);
    }
    #list(filter, privileged) {
        const names = filter.toolset
            ? new Set(this.#toolsets.get(filter.toolset) ?? [])
            : undefined;
        const capabilities = new Set(filter.capabilities ?? []);
        return [...this.#tools.values()]
            .filter((tool) => (!names || names.has(tool.name)) &&
            (privileged ||
                (capabilities.size > 0 &&
                    tool.capabilities.every((cap) => capabilities.has(cap)))))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    async available(filter = {}) {
        const checks = await Promise.all(this.list(filter).map(async (tool) => {
            try {
                return {
                    tool,
                    available: ((await tool.availability?.()) ?? { available: true })
                        .available,
                };
            }
            catch {
                return { tool, available: false };
            }
        }));
        return checks.filter((x) => x.available).map((x) => x.tool);
    }
    schemas(filter = {}) {
        return this.list(filter).map(toModelSchema);
    }
    schemasPrivileged(filter = {}) {
        return this.listPrivileged(filter).map(toModelSchema);
    }
    classify(name) {
        const tool = this.#require(name);
        return { effect: tool.effect, parallelSafe: tool.parallelSafe };
    }
    async invoke(name, input, context) {
        const invocationId = context.invocationId ?? `tool-${++this.#sequence}`;
        const tool = this.#tools.get(name);
        const reject = async (code, message, details, metadata) => {
            const result = failure(name, invocationId, code, message, details);
            await this.#emit({
                phase: "finish",
                invocationId,
                tool: name,
                effect: metadata?.effect ?? "admin",
                parallelSafe: metadata?.parallelSafe ?? false,
                ok: false,
                errorCode: code,
            });
            return result;
        };
        if (!tool)
            return reject("UNKNOWN_TOOL", `Unknown tool: ${name}`);
        if (!tool.capabilities.every((cap) => context.capabilities.includes(cap)))
            return reject("CAPABILITY_DENIED", "Required capability not granted", undefined, tool);
        let status;
        try {
            status = (await tool.availability?.()) ?? { available: true };
        }
        catch (error) {
            return reject("UNAVAILABLE", errorMessage(error), undefined, tool);
        }
        if (!status.available)
            return reject("UNAVAILABLE", status.reason ?? "Tool unavailable", undefined, tool);
        const parsed = tool.inputSchema.safeParse(input);
        if (!parsed.success)
            return reject("INVALID_INPUT", "Input validation failed", parsed.error.flatten(), tool);
        const controller = new AbortController();
        let timeoutTriggered = false;
        let rejectAbort;
        const abortPromise = new Promise((_, rejectPromise) => {
            rejectAbort = rejectPromise;
        });
        const abort = (timeout) => {
            timeoutTriggered ||= timeout;
            controller.abort(timeout ? new Error("Tool timed out") : context.signal?.reason);
            rejectAbort(controller.signal.reason);
        };
        const callerAborted = () => abort(false);
        context.signal?.addEventListener("abort", callerAborted, { once: true });
        const timeout = setTimeout(() => abort(true), tool.timeoutMs ?? this.#defaultTimeoutMs);
        await this.#emit({
            phase: "start",
            invocationId,
            tool: name,
            effect: tool.effect,
            parallelSafe: tool.parallelSafe,
        });
        let result;
        try {
            if (context.signal?.aborted)
                abort(false);
            const data = await Promise.race([
                Promise.resolve(tool.execute(parsed.data, {
                    signal: controller.signal,
                    invocationId,
                    capabilities: new Set(context.capabilities),
                })),
                abortPromise,
            ]);
            const output = tool.outputSchema.safeParse(data);
            result = output.success
                ? { ok: true, invocationId, tool: name, data: output.data }
                : failure(name, invocationId, "INVALID_OUTPUT", "Output validation failed", output.error.flatten());
        }
        catch (error) {
            const code = controller.signal.aborted
                ? timeoutTriggered
                    ? "TIMEOUT"
                    : "CANCELLED"
                : "EXECUTION_ERROR";
            result = failure(name, invocationId, code, errorMessage(error));
        }
        finally {
            clearTimeout(timeout);
            context.signal?.removeEventListener("abort", callerAborted);
        }
        const finish = {
            phase: "finish",
            invocationId,
            tool: name,
            effect: tool.effect,
            parallelSafe: tool.parallelSafe,
            ok: result.ok,
        };
        if (isFailure(result))
            finish.errorCode = result.error.code;
        await this.#emit(finish);
        return result;
    }
    async invokeParallel(calls, context) {
        for (const call of calls)
            if (!this.#require(call.name).parallelSafe)
                throw new Error(`Tool is not parallel-safe: ${call.name}`);
        return Promise.all(calls.map((call, index) => this.invoke(call.name, call.input, {
            ...context,
            ...(context.invocationId
                ? { invocationId: `${context.invocationId}:${index}` }
                : {}),
        })));
    }
    #require(name) {
        const tool = this.#tools.get(name);
        if (!tool)
            throw new Error(`Unknown tool: ${name}`);
        return tool;
    }
    async #emit(event) {
        try {
            await this.#audit?.(event);
        }
        catch {
            /* observational */
        }
    }
}
function failure(tool, invocationId, code, message, details) {
    return {
        ok: false,
        invocationId,
        tool,
        error: { code, message, ...(details === undefined ? {} : { details }) },
    };
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function isFailure(result) {
    return !result.ok;
}
function jsonSchema(schema) {
    const convert = zodToJsonSchema;
    return convert(schema, { $refStrategy: "none" });
}
function toModelSchema(tool) {
    return {
        name: tool.name,
        description: tool.description,
        inputSchema: jsonSchema(tool.inputSchema),
        outputSchema: jsonSchema(tool.outputSchema),
    };
}
