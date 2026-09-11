export const sessionKey = (channel, conversationId, threadId) => [channel, conversationId, threadId].filter((x) => x !== undefined).join(":");
export function chunkTelegramText(text, max = 4096) {
    if (!Number.isInteger(max) || max < 1)
        throw new Error("Invalid message length");
    const out = [];
    for (let rest = text; rest;) {
        if (rest.length <= max) {
            out.push(rest);
            break;
        }
        let cut = rest.lastIndexOf("\n", max);
        if (cut < 1)
            cut = max;
        else
            cut++;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
    }
    return out;
}
export class TelegramChannel {
    seen = new Set();
    fetch;
    authorize;
    token;
    max;
    constructor(o) {
        this.token = o.token ?? "";
        this.fetch = o.fetch;
        this.authorize = o.authorize;
        this.max = o.maxMessageLength ?? 4096;
    }
    async receive(input) {
        if (!input || typeof input !== "object")
            return undefined;
        const u = input;
        if (!Number.isSafeInteger(u.update_id) || this.seen.has(u.update_id))
            return undefined;
        this.seen.add(u.update_id);
        const m = u.message ?? u.edited_message;
        if (!m?.text || !m.from)
            return undefined;
        const userId = String(m.from.id), chatId = String(m.chat.id), username = m.from.username;
        if (!(await this.authorize({
            userId,
            chatId,
            ...(username === undefined ? {} : { username }),
        })))
            return undefined;
        const threadId = m.message_thread_id === undefined
            ? undefined
            : String(m.message_thread_id), route = {
            chatId,
            ...(threadId === undefined ? {} : { threadId }),
        };
        const match = /^\/(approve|reject)\s+([A-Za-z][A-Za-z0-9_-]{2,127})$/.exec(m.text.trim());
        const actor = {
            id: userId,
            ...(username === undefined ? {} : { username }),
        };
        return {
            id: `telegram:${u.update_id}`,
            channel: "telegram",
            text: m.text,
            sessionKey: sessionKey("telegram", chatId, threadId),
            replyTo: route,
            actor,
            receivedAt: m.date * 1000,
            ...(match
                ? {
                    command: {
                        type: "approval",
                        action: match[1],
                        approvalId: match[2],
                    },
                }
                : {}),
            raw: input,
        };
    }
    async send(o) {
        if (o.channel !== "telegram")
            throw new Error("Invalid outbound channel");
        for (const text of chunkTelegramText(o.text, this.max)) {
            const body = {
                chat_id: o.route.chatId,
                ...(o.route.threadId === undefined
                    ? {}
                    : { message_thread_id: Number(o.route.threadId) }),
                text,
            };
            const r = await this.fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!r.ok)
                throw new Error("Telegram send failed");
        }
    }
}
