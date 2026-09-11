export class AgentRuntimeError extends Error {
    code;
    cause;
    constructor(code, message, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = "AgentRuntimeError";
    }
}
export class AgentRuntime {
    #options;
    constructor(options) {
        if (!options.providers.length)
            throw new AgentRuntimeError("MODEL_ERROR", "At least one provider is required");
        for (const [name, value] of [
            ["maxIterations", options.maxIterations ?? 8],
            ["maxToolCalls", options.maxToolCalls ?? 16],
            ["maxRepeatedToolCalls", options.maxRepeatedToolCalls ?? 3],
        ])
            if (!Number.isInteger(value) || value <= 0)
                throw new AgentRuntimeError("MODEL_ERROR", `${name} must be a positive integer`);
        this.#options = {
            ...options,
            maxIterations: options.maxIterations ?? 8,
            maxToolCalls: options.maxToolCalls ?? 16,
            maxRepeatedToolCalls: options.maxRepeatedToolCalls ?? 3,
        };
    }
    async *run(input) {
        const now = () => ({ timestamp: Date.now() });
        const controller = new AbortController();
        let timedOut = false;
        const abort = () => controller.abort(input.signal?.reason);
        input.signal?.addEventListener("abort", abort, { once: true });
        if (input.signal?.aborted)
            abort();
        const delay = input.deadline === undefined
            ? undefined
            : Math.max(0, input.deadline - Date.now());
        const timer = delay === undefined
            ? undefined
            : setTimeout(() => {
                timedOut = true;
                controller.abort(new Error("deadline exceeded"));
            }, delay);
        const messages = [...input.messages];
        let toolCount = 0;
        let sideEffects = false;
        let activeProvider = 0;
        const repeated = new Map();
        yield { type: "run.started", ...now() };
        try {
            for (let iteration = 1; iteration <= this.#options.maxIterations; iteration++) {
                if (controller.signal.aborted)
                    throw controller.signal.reason;
                yield { type: "iteration.started", iteration, ...now() };
                let modelResponse;
                for (let index = activeProvider; index < this.#options.providers.length; index++) {
                    const provider = this.#options.providers[index];
                    yield {
                        type: "model.requested",
                        provider: provider.id,
                        iteration,
                        ...now(),
                    };
                    try {
                        modelResponse = await abortable(provider.complete({ messages }, controller.signal), controller.signal);
                        validateResponse(modelResponse);
                        activeProvider = index;
                        yield {
                            type: "model.responded",
                            provider: provider.id,
                            response: modelResponse,
                            ...now(),
                        };
                        break;
                    }
                    catch (error) {
                        if (controller.signal.aborted)
                            throw error;
                        yield {
                            type: "provider.failed",
                            provider: provider.id,
                            error: error instanceof Error ? error.message : String(error),
                            ...now(),
                        };
                        if (sideEffects || index === this.#options.providers.length - 1)
                            throw new AgentRuntimeError("MODEL_ERROR", error instanceof Error ? error.message : String(error), error);
                    }
                }
                if (!modelResponse)
                    throw new AgentRuntimeError("MODEL_ERROR", "No model response");
                const assistant = modelResponse.message;
                const calls = assistant.toolCalls ?? [];
                if (!calls.length) {
                    await this.#options.persistMessage?.(assistant);
                    yield {
                        type: "run.completed",
                        message: assistant,
                        iterations: iteration,
                        toolCalls: toolCount,
                        ...now(),
                    };
                    return;
                }
                if (iteration === this.#options.maxIterations)
                    throw new AgentRuntimeError("ITERATION_BUDGET_EXCEEDED", "Iteration budget exceeded");
                if (toolCount + calls.length > this.#options.maxToolCalls)
                    throw new AgentRuntimeError("TOOL_BUDGET_EXCEEDED", "Tool-call budget exceeded");
                if (!this.#options.tools)
                    throw new AgentRuntimeError("NO_TOOL_DISPATCHER", "Model requested tools but no dispatcher is configured");
                const seen = new Set();
                const validated = [];
                for (const call of calls) {
                    if (!call ||
                        typeof call.id !== "string" ||
                        !call.id.trim() ||
                        seen.has(call.id) ||
                        typeof call.name !== "string" ||
                        !call.name.trim())
                        throw new AgentRuntimeError("MODEL_ERROR", "Malformed or duplicate tool call");
                    seen.add(call.id);
                    const signature = `${call.name}:${stableStringify(call.arguments)}`;
                    const count = (repeated.get(signature) ?? 0) + 1;
                    if (count > this.#options.maxRepeatedToolCalls)
                        throw new AgentRuntimeError("LOOP_DETECTED", `Repeated tool call detected: ${call.name}`);
                    const effect = this.#options.tools.classify(call.name)?.effect;
                    if ((effect !== "read" && effect !== "proposal") ||
                        deniedTool(call.name))
                        throw new AgentRuntimeError("UNSAFE_TOOL", `Runtime cannot execute tool: ${call.name}`);
                    validated.push({ call, signature, effect });
                }
                await this.#options.persistMessage?.(assistant);
                messages.push(assistant);
                for (const { call, signature, effect } of validated) {
                    repeated.set(signature, (repeated.get(signature) ?? 0) + 1);
                    await this.#options.persistToolLifecycle?.({
                        status: "planned",
                        call,
                    });
                    yield { type: "tool.started", call, ...now() };
                    await this.#options.persistToolLifecycle?.({
                        status: "started",
                        call,
                    });
                    let result;
                    try {
                        result = await abortable(this.#options.tools.dispatch(call, { signal: controller.signal }), controller.signal);
                        toolCount++;
                        sideEffects ||= effect === "proposal";
                        await this.#options.persistToolLifecycle?.({
                            status: "succeeded",
                            call,
                            result,
                        });
                    }
                    catch (error) {
                        if (!controller.signal.aborted)
                            await this.#options.persistToolLifecycle?.({
                                status: "failed",
                                call,
                                error,
                            });
                        throw error;
                    }
                    yield { type: "tool.completed", call, result, ...now() };
                    const toolMessage = {
                        role: "tool",
                        name: call.name,
                        toolCallId: call.id,
                        content: stableStringify(result),
                    };
                    try {
                        await this.#options.persistMessage?.(toolMessage);
                        messages.push(toolMessage);
                    }
                    catch (error) {
                        await this.#options.persistToolLifecycle?.({
                            status: "reconciliation-required",
                            call,
                            result,
                            error,
                        });
                        throw new AgentRuntimeError("RECONCILIATION_REQUIRED", "Tool executed but result persistence failed", error);
                    }
                }
            }
            throw new AgentRuntimeError("ITERATION_BUDGET_EXCEEDED", "Iteration budget exceeded");
        }
        catch (error) {
            if (controller.signal.aborted) {
                if (timedOut)
                    yield {
                        type: "run.failed",
                        error: {
                            code: "DEADLINE_EXCEEDED",
                            message: "Run deadline exceeded",
                        },
                        ...now(),
                    };
                else
                    yield {
                        type: "run.cancelled",
                        ...(controller.signal.reason === undefined
                            ? {}
                            : { reason: controller.signal.reason }),
                        ...now(),
                    };
            }
            else {
                const failure = error instanceof AgentRuntimeError
                    ? error
                    : new AgentRuntimeError("MODEL_ERROR", error instanceof Error ? error.message : String(error), error);
                yield {
                    type: "run.failed",
                    error: { code: failure.code, message: failure.message },
                    ...now(),
                };
            }
        }
        finally {
            if (timer !== undefined)
                clearTimeout(timer);
            input.signal?.removeEventListener("abort", abort);
        }
    }
}
function deniedTool(name) {
    return /(^|[._-])(sign|signer|send|broadcast|write|execute)([._-]|$)|wallet/i.test(name);
}
function validateResponse(value) {
    const message = value?.message;
    if (!message ||
        message.role !== "assistant" ||
        typeof message.content !== "string" ||
        (message.toolCalls !== undefined && !Array.isArray(message.toolCalls)))
        throw new AgentRuntimeError("MODEL_ERROR", "Malformed model response");
}
function abortable(promise, signal) {
    promise.catch(() => undefined);
    if (signal.aborted)
        return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        promise
            .then(resolve, reject)
            .finally(() => signal.removeEventListener("abort", abort));
    });
}
function stableStringify(value) {
    if (value === undefined)
        return "undefined";
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
        .join(",")}}`;
}
