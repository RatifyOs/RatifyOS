import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { TelegramChannel, } from "../gateway/channels/index.js";
export class FileTelegramOffsetStore {
    path;
    constructor(path) {
        this.path = path;
    }
    async load() {
        try {
            const n = Number(await readFile(this.path, "utf8"));
            return Number.isSafeInteger(n) && n >= 0 ? n : 0;
        }
        catch {
            return 0;
        }
    }
    async save(n) {
        await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
        const tmp = `${this.path}.${process.pid}.tmp`;
        await writeFile(tmp, String(n), { mode: 0o600 });
        await rename(tmp, this.path);
    }
}
export class TelegramRunner {
    o;
    stopped = false;
    channel;
    constructor(o) {
        this.o = o;
        if (!o.token)
            throw Error("Telegram token required");
        this.channel = new TelegramChannel({
            token: o.token,
            fetch: o.fetch,
            authorize: ({ userId, chatId }) => (o.allowedUserIds?.has(userId) ?? false) &&
                (o.allowedChatIds?.size ? o.allowedChatIds.has(chatId) : true),
        });
    }
    url(method) {
        return `https://api.telegram.org/bot${this.o.token}/${method}`;
    }
    async check() {
        const r = await this.o.fetch(this.url("getMe"));
        if (!r.ok)
            return false;
        return Boolean((await r.json()).ok);
    }
    async pollOnce() {
        const offset = await this.o.store.load();
        const r = await this.o.fetch(`${this.url("getUpdates")}?offset=${offset}&timeout=25&limit=50`);
        if (!r.ok) {
            if (r.status === 429) {
                const retry = Number(r.headers?.get("retry-after") ?? 1);
                await (this.o.sleep ?? ((ms) => new Promise((x) => setTimeout(x, ms))))(Math.min(60, retry) * 1000);
                return;
            }
            throw Error("Telegram polling failed");
        }
        const body = await r.json();
        if (!body.ok || !Array.isArray(body.result))
            throw Error("Invalid Telegram response");
        for (const update of body.result) {
            if (!Number.isSafeInteger(update.update_id) || update.update_id < offset)
                continue;
            await this.o.store.save(update.update_id + 1);
            const inbound = await this.channel.receive(update);
            if (!inbound)
                continue;
            const text = await (inbound.command && this.o.approval
                ? this.o.approval(inbound)
                : this.o.dispatch(inbound));
            if (text)
                await this.channel.send({
                    channel: "telegram",
                    route: inbound.replyTo,
                    text,
                });
        }
    }
    async run() {
        let failures = 0;
        while (!this.stopped) {
            try {
                await this.pollOnce();
                failures = 0;
            }
            catch {
                failures++;
                await (this.o.sleep ?? ((ms) => new Promise((x) => setTimeout(x, ms))))(Math.min(30_000, 500 * 2 ** Math.min(failures, 6)));
            }
        }
    }
    stop() {
        this.stopped = true;
    }
}
