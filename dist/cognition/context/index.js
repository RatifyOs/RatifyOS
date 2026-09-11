const financialKinds = new Set([
    "approval",
    "policy",
    "simulation",
    "transaction",
    "receipt",
]);
const TRUSTED_OVERVIEW = "Pruned context is available only through the listed message and evidence references.";
const defaultEstimate = (message) => Math.ceil(JSON.stringify({
    role: message.role,
    id: message.id,
    content: message.content,
    name: message.name,
    toolCallId: message.toolCallId,
    toolCalls: message.toolCalls,
    kind: message.kind,
    evidenceRef: message.evidenceRef,
}).length / 4) + 8;
const secretPatterns = [
    [
        /-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/gi,
        "[REDACTED PRIVATE KEY]",
    ],
    [/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]"],
    [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED JWT]"],
    [
        /(\b(?:authorization|cookie|api[_-]?key|secret|token|password|seed(?: phrase)?)\s*[=:]\s*)[^\s,;]+/gi,
        "$1[REDACTED]",
    ],
    [/\b(?:sk|pk)_[A-Za-z0-9_-]{12,}\b/g, "[REDACTED]"],
    [/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[REDACTED]@"],
    [/([?&](?:token|key|secret|password)=)[^&#\s]+/gi, "$1[REDACTED]"],
];
function redactText(value) {
    let result = value;
    for (const [p, r] of secretPatterns)
        result = result.replace(p, r);
    return result;
}
function redactUnknown(value) {
    if (typeof value === "string")
        return redactText(value);
    if (Array.isArray(value))
        return value.map(redactUnknown);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            /authorization|cookie|secret|token|password|api.?key|seed|private.?key/i.test(key)
                ? "[REDACTED]"
                : redactUnknown(item),
        ]));
    return value;
}
function redact(message) {
    return {
        ...message,
        id: redactText(message.id),
        content: redactText(message.content),
        ...(message.name ? { name: redactText(message.name) } : {}),
        ...(message.toolCallId
            ? { toolCallId: redactText(message.toolCallId) }
            : {}),
        ...(message.evidenceRef
            ? { evidenceRef: redactText(message.evidenceRef) }
            : {}),
        ...(message.toolCalls
            ? {
                toolCalls: message.toolCalls.map((call) => ({
                    id: redactText(call.id),
                    name: redactText(call.name),
                    arguments: redactUnknown(call.arguments),
                })),
            }
            : {}),
    };
}
function clone(message) {
    return structuredClone(message);
}
function safeEvidenceRef(value) {
    return (typeof value === "string" &&
        /^evidence:\/\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(value) &&
        value.length <= 512);
}
function validatedEstimate(fn, m) {
    let n;
    try {
        n = fn(m);
    }
    catch {
        throw new Error("estimateTokens threw");
    }
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n))
        throw new Error("estimateTokens must return a finite non-negative integer");
    return n;
}
function buildUnits(messages) {
    const units = [];
    for (let i = 0; i < messages.length; i++) {
        const current = messages[i];
        if (current.role === "tool")
            throw new Error("Invalid tool exchange: orphan or delayed result");
        if (current.role === "assistant" && current.toolCalls?.length) {
            const callIds = current.toolCalls.map((c) => c.id);
            if (callIds.some((id) => !id) || new Set(callIds).size !== callIds.length)
                throw new Error("Invalid tool exchange: duplicate or empty call id");
            const unit = [i];
            for (let k = 0; k < callIds.length; k++) {
                const result = messages[i + 1 + k];
                if (!result ||
                    result.role !== "tool" ||
                    result.toolCallId !== callIds[k])
                    throw new Error("Invalid tool exchange: missing, delayed, or reordered result");
                unit.push(i + 1 + k);
            }
            const after = messages[i + 1 + callIds.length];
            if (after?.role === "tool")
                throw new Error("Invalid tool exchange: duplicate or orphan result");
            units.push(unit);
            i += callIds.length;
            continue;
        }
        const next = messages[i + 1];
        if (current.role === "user" &&
            next?.role === "assistant" &&
            !next.toolCalls?.length) {
            units.push([i, i + 1]);
            i++;
        }
        else
            units.push([i]);
    }
    return units;
}
function sanitizedPrior(prior) {
    return {
        version: 1,
        overview: redactText(String(prior.overview)).slice(0, 1000),
        references: Array.isArray(prior.references)
            ? prior.references.map((r) => ({
                messageId: redactText(String(r.messageId)),
                description: redactText(String(r.description)).slice(0, 240),
                ...(safeEvidenceRef(r.evidenceRef)
                    ? { evidenceRef: r.evidenceRef }
                    : {}),
            }))
            : [],
    };
}
async function summarizeSafely(summarizer, input, timeoutMs) {
    let timer;
    try {
        return await Promise.race([
            summarizer(input),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error("summary timeout")), Math.max(1, timeoutMs));
            }),
        ]);
    }
    catch {
        return undefined;
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
export async function compileContext(input, options) {
    if (!Number.isFinite(options.maxTokens) ||
        options.maxTokens < 0 ||
        !Number.isInteger(options.maxTokens))
        throw new Error("maxTokens must be a non-negative integer");
    const messages = input.map(clone), seenIds = new Set();
    for (const m of messages) {
        if (!m.id || seenIds.has(m.id))
            throw new Error("Message id must be non-empty and unique");
        seenIds.add(m.id);
    }
    const allUnits = buildUnits(messages);
    const baseEstimate = options.estimateTokens ?? defaultEstimate;
    const estimates = messages.map((m) => validatedEstimate(baseEstimate, m));
    const head = Math.max(0, Math.floor(options.headMessages ?? 1)), tail = Math.max(0, Math.floor(options.tailMessages ?? 4));
    const initialTokens = estimates.reduce((a, b) => a + b, 0);
    const protectedIndexes = new Set();
    for (const unit of allUnits) {
        const protectedUnit = unit.some((i) => i < head ||
            i >= Math.max(head, messages.length - tail) ||
            financialKinds.has(messages[i].kind) ||
            (messages[i].role === "tool" &&
                !!messages[i].evidenceRef &&
                !safeEvidenceRef(messages[i].evidenceRef)));
        if (protectedUnit)
            unit.forEach((i) => protectedIndexes.add(i));
    }
    const removed = new Set();
    let tokens = initialTokens;
    for (const unit of allUnits) {
        if (tokens <= options.maxTokens)
            break;
        if (unit.some((i) => protectedIndexes.has(i)))
            continue;
        unit.forEach((i) => {
            removed.add(i);
            tokens -= estimates[i];
        });
    }
    const pruned = messages.filter((_, i) => removed.has(i));
    const requiredReferences = pruned
        .filter((m) => m.role === "tool" && safeEvidenceRef(m.evidenceRef))
        .map((m) => ({
        messageId: m.id,
        description: "Evidence reference",
        evidenceRef: m.evidenceRef,
    }));
    let summary;
    if (options.summarizer && pruned.length) {
        const raw = await summarizeSafely(options.summarizer, {
            messages: pruned.map(redact),
            ...(options.priorSummary
                ? { priorSummary: sanitizedPrior(options.priorSummary) }
                : {}),
            requiredReferences: structuredClone(requiredReferences),
        }, options.summarizerTimeoutMs ?? 2_000);
        if (raw &&
            typeof raw === "object" &&
            Array.isArray(raw.references)) {
            const requiredIds = new Set(requiredReferences.map((r) => r.messageId));
            const allowed = new Set(pruned.map((m) => m.id));
            const optional = [];
            const used = new Set(requiredIds);
            for (const item of raw.references)
                if (item && typeof item === "object") {
                    const id = String(item.messageId ?? "");
                    if (allowed.has(id) && !used.has(id)) {
                        used.add(id);
                        optional.push({
                            messageId: id,
                            description: "Archived message reference",
                        });
                    }
                }
            summary = {
                version: 1,
                overview: TRUSTED_OVERVIEW,
                references: [...requiredReferences, ...optional],
            };
        }
    }
    const compiled = messages.filter((_, i) => !removed.has(i));
    if (summary) {
        const summaryMessage = {
            id: "context-handoff-summary",
            role: "system",
            kind: "handoff-summary",
            content: `TRUSTED_CONTEXT_REFERENCE_V1\n${JSON.stringify(summary)}`,
        };
        const summaryTokens = validatedEstimate(baseEstimate, summaryMessage);
        if (tokens + summaryTokens <= options.maxTokens) {
            compiled.splice(Math.min(head, compiled.length), 0, summaryMessage);
            tokens += summaryTokens;
        }
        else
            summary = undefined;
    }
    const finalTokens = compiled.reduce((sum, m) => sum + validatedEstimate(baseEstimate, m), 0);
    const protectedMessageIds = messages
        .filter((_, i) => protectedIndexes.has(i))
        .map((m) => m.id);
    const evidenceReferences = [
        ...new Set(requiredReferences
            .map((r) => r.evidenceRef)
            .concat(messages
            .filter((m) => !removed.has(messages.indexOf(m)) &&
            safeEvidenceRef(m.evidenceRef))
            .map((m) => m.evidenceRef))),
    ];
    return {
        messages: compiled,
        ...(summary ? { summary } : {}),
        diagnostics: {
            initialTokens,
            finalTokens,
            prunedMessageIds: pruned.map((m) => m.id),
            protectedMessageIds,
            evidenceReferences,
            overBudget: finalTokens > options.maxTokens,
            summarized: !!summary,
        },
    };
}
