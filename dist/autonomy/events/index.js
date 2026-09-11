import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
const freeze = (value) => {
    if (value && typeof value === "object") {
        for (const item of Object.values(value))
            freeze(item);
        Object.freeze(value);
    }
    return value;
};
const nonempty = (x) => typeof x === "string" && x.trim().length > 0;
export function createEnvelope(input) {
    if (!nonempty(input.type) ||
        !nonempty(input.source) ||
        !Number.isSafeInteger(input.version ?? 1) ||
        (input.version ?? 1) < 1)
        throw Error("invalid event envelope");
    const id = input.id?.() ?? randomUUID();
    const occurredAt = (input.now?.() ?? new Date()).toISOString();
    if (input.block &&
        (!nonempty(input.block.hash) ||
            !nonempty(input.block.parentHash) ||
            input.block.number < 0n ||
            !["unsafe", "safe", "finalized"].includes(input.block.finality)))
        throw Error("invalid chain position");
    const value = {
        id,
        type: input.type,
        version: input.version ?? 1,
        source: input.source,
        correlationId: input.correlationId ?? id,
        occurredAt,
        payload: input.payload,
        ...(input.causationId ? { causationId: input.causationId } : {}),
        ...(input.block ? { block: input.block } : {}),
        ...(input.provenance ? { provenance: input.provenance } : {}),
    };
    return freeze(value);
}
export function reorgCorrection(original, canonical) {
    if (!original.block)
        throw Error("cannot correct an event without a block");
    return createEnvelope({
        id: () => createHash("sha256")
            .update(`${original.id}:${canonical.hash}`)
            .digest("hex"),
        type: "chain.reorg.correction",
        source: "chain",
        correlationId: original.correlationId,
        causationId: original.id,
        payload: {
            orphanedEventId: original.id,
            orphanedBlockHash: original.block.hash,
            canonicalBlockHash: canonical.hash,
            canonicalBlockNumber: canonical.number,
            reversal: true,
        },
        block: canonical,
    });
}
const noopTx = (id) => ({
    idempotencyKey: id,
    execute: () => {
        throw Error("transactional effects require SqliteEventBus");
    },
    query: () => [],
});
export class InMemoryEventBus {
    events = [];
    subscriptions = new Map();
    offsets = new Map();
    chains = new Map();
    subscribe(name, handler, options = {}) {
        if (this.subscriptions.has(name))
            throw Error(`duplicate consumer ${name}`);
        this.subscriptions.set(name, { name, handler, options });
        return () => this.subscriptions.delete(name);
    }
    enqueue(s, fn) {
        const next = (this.chains.get(s.name) ?? Promise.resolve()).then(fn);
        this.chains.set(s.name, next.catch(() => { }));
        return next;
    }
    async publish(envelope) {
        const stored = { cursor: this.events.length + 1, envelope };
        this.events.push(stored);
        for (const s of this.subscriptions.values())
            await this.enqueue(s, () => this.process(s, stored)).catch(() => { });
        return stored;
    }
    async deliver() {
        for (const s of this.subscriptions.values())
            await this.enqueue(s, async () => {
                for (const x of this.events)
                    if (x.cursor > (this.offsets.get(s.name) ?? 0))
                        await this.process(s, x);
            });
    }
    async process(s, x) {
        if (x.cursor <= (this.offsets.get(s.name) ?? 0))
            return;
        if (this.matches(x.envelope, s.options))
            await s.handler(x.envelope, noopTx(x.envelope.id));
        this.offsets.set(s.name, x.cursor);
    }
    matches(e, o) {
        return (!o.types || o.types.includes(e.type)) && (!o.filter || o.filter(e));
    }
    async replay(cursor, o = {}) {
        return this.events
            .filter((x) => x.cursor > cursor && this.matches(x.envelope, o))
            .slice(0, o.limit ?? 1000);
    }
    async offset(c) {
        return this.offsets.get(c) ?? 0;
    }
}
const encode = (_k, v) => typeof v === "bigint" ? { $bigint: v.toString() } : v;
const decode = (_k, v) => v &&
    typeof v === "object" &&
    Object.keys(v).length === 1 &&
    typeof v.$bigint === "string"
    ? BigInt(v.$bigint)
    : v;
const locks = new Map();
export class SqliteEventBus {
    path;
    config;
    db;
    subscriptions = new Map();
    maxAttempts;
    batchSize;
    constructor(path, config = {}) {
        this.path = path;
        this.config = config;
        this.maxAttempts = config.maxAttempts ?? 5;
        this.batchSize = config.batchSize ?? 100;
        this.db = new DatabaseSync(path);
        this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS outbox(cursor INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT UNIQUE NOT NULL,type TEXT NOT NULL,envelope TEXT NOT NULL); CREATE INDEX IF NOT EXISTS outbox_type_cursor ON outbox(type,cursor); CREATE TABLE IF NOT EXISTS inbox(consumer TEXT NOT NULL,event_id TEXT NOT NULL,PRIMARY KEY(consumer,event_id)); CREATE TABLE IF NOT EXISTS consumer_offsets(consumer TEXT PRIMARY KEY,cursor INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS retries(consumer TEXT NOT NULL,cursor INTEGER NOT NULL,attempts INTEGER NOT NULL,last_error TEXT,PRIMARY KEY(consumer,cursor)); CREATE TABLE IF NOT EXISTS dead_letters(consumer TEXT NOT NULL,cursor INTEGER NOT NULL,event_id TEXT NOT NULL,error TEXT NOT NULL,PRIMARY KEY(consumer,cursor)); CREATE TABLE IF NOT EXISTS subscriptions(consumer TEXT PRIMARY KEY,definition TEXT NOT NULL);");
    }
    normalize(e) {
        const schema = this.config.schemas?.[e.type];
        if (!schema)
            return e;
        if (e.version > schema.latest)
            throw Error(`unsupported schema version ${e.version}`);
        const payload = e.version < schema.latest && schema.upcast
            ? schema.upcast(e.payload, e.version)
            : e.payload;
        if (!schema.validate(payload))
            throw Error(`schema validation failed for ${e.type}`);
        return freeze({ ...e, version: schema.latest, payload });
    }
    subscribe(name, handler, options = {}) {
        if (this.subscriptions.has(name))
            throw Error(`duplicate consumer ${name}`);
        const definition = JSON.stringify({
            types: options.types ?? null,
            version: options.subscriptionVersion ?? "1",
            filter: options.filter?.toString() ?? null,
        });
        const old = this.db
            .prepare("SELECT definition FROM subscriptions WHERE consumer=?")
            .get(name);
        if (old && old.definition !== definition)
            throw Error(`subscription definition changed for ${name}`);
        this.db
            .prepare("INSERT OR IGNORE INTO subscriptions VALUES(?,?)")
            .run(name, definition);
        this.subscriptions.set(name, { name, handler, options });
        return () => this.subscriptions.delete(name);
    }
    serialized(fn) {
        const prior = locks.get(this.path) ?? Promise.resolve();
        const next = prior.then(fn);
        locks.set(this.path, next.catch(() => { }));
        return next;
    }
    async publish(input) {
        const envelope = this.normalize(input);
        this.db
            .prepare("INSERT OR IGNORE INTO outbox(event_id,type,envelope) VALUES(?,?,?)")
            .run(envelope.id, envelope.type, JSON.stringify(envelope, encode));
        const row = this.db
            .prepare("SELECT cursor FROM outbox WHERE event_id=?")
            .get(envelope.id);
        const stored = { cursor: Number(row.cursor), envelope };
        for (const s of this.subscriptions.values())
            await this.serialized(() => this.process(s, stored)).catch(() => { });
        return stored;
    }
    matches(e, o) {
        return (!o.types || o.types.includes(e.type)) && (!o.filter || o.filter(e));
    }
    tx(id) {
        return {
            idempotencyKey: id,
            execute: (sql, ...p) => this.db.prepare(sql).run(...p),
            query: (sql, ...p) => this.db.prepare(sql).all(...p),
        };
    }
    async process(s, x) {
        if (x.cursor <= (await this.offset(s.name)))
            return;
        this.db.exec("BEGIN IMMEDIATE");
        try {
            if (this.matches(x.envelope, s.options))
                await s.handler(x.envelope, this.tx(x.envelope.id));
            this.db
                .prepare("INSERT OR IGNORE INTO inbox VALUES(?,?)")
                .run(s.name, x.envelope.id);
            this.db
                .prepare("INSERT INTO consumer_offsets VALUES(?,?) ON CONFLICT(consumer) DO UPDATE SET cursor=excluded.cursor")
                .run(s.name, x.cursor);
            this.db
                .prepare("DELETE FROM retries WHERE consumer=? AND cursor=?")
                .run(s.name, x.cursor);
            this.db.exec("COMMIT");
        }
        catch (error) {
            this.db.exec("ROLLBACK");
            const msg = error instanceof Error ? error.message : String(error);
            this.db
                .prepare("INSERT INTO retries VALUES(?,?,1,?) ON CONFLICT(consumer,cursor) DO UPDATE SET attempts=attempts+1,last_error=excluded.last_error")
                .run(s.name, x.cursor, msg);
            const r = this.db
                .prepare("SELECT attempts FROM retries WHERE consumer=? AND cursor=?")
                .get(s.name, x.cursor);
            if (Number(r.attempts) >= this.maxAttempts) {
                this.db.exec("BEGIN IMMEDIATE");
                try {
                    this.db
                        .prepare("INSERT OR IGNORE INTO dead_letters VALUES(?,?,?,?)")
                        .run(s.name, x.cursor, x.envelope.id, msg);
                    this.db
                        .prepare("INSERT INTO consumer_offsets VALUES(?,?) ON CONFLICT(consumer) DO UPDATE SET cursor=excluded.cursor")
                        .run(s.name, x.cursor);
                    this.db.exec("COMMIT");
                }
                catch (e) {
                    this.db.exec("ROLLBACK");
                    throw e;
                }
            }
            else
                throw error;
        }
    }
    async deliver() {
        for (const s of this.subscriptions.values())
            await this.serialized(async () => {
                for (;;) {
                    const rows = await this.replay(await this.offset(s.name), {
                        limit: this.batchSize,
                    });
                    if (!rows.length)
                        break;
                    for (const x of rows)
                        await this.process(s, x);
                    if (rows.length < this.batchSize)
                        break;
                }
            });
    }
    async replay(cursor, o = {}) {
        const limit = Math.max(1, Math.min(o.limit ?? this.batchSize, 1000));
        const rows = this.db
            .prepare("SELECT cursor,envelope FROM outbox WHERE cursor>? ORDER BY cursor LIMIT ?")
            .all(cursor, limit);
        const result = [];
        for (const r of rows) {
            try {
                const e = this.normalize(JSON.parse(r.envelope, decode));
                if (this.matches(e, o))
                    result.push({ cursor: Number(r.cursor), envelope: e });
            }
            catch {
                /* malformed persisted rows are poison and omitted from administrative replay */
            }
        }
        return result;
    }
    async offset(c) {
        const row = this.db
            .prepare("SELECT cursor FROM consumer_offsets WHERE consumer=?")
            .get(c);
        return Number(row?.cursor ?? 0);
    }
    deadLetters(c) {
        return (c
            ? this.db
                .prepare("SELECT * FROM dead_letters WHERE consumer=? ORDER BY cursor")
                .all(c)
            : this.db
                .prepare("SELECT * FROM dead_letters ORDER BY consumer,cursor")
                .all());
    }
    execute(sql, ...p) {
        return this.db.prepare(sql).run(...p);
    }
    query(sql, ...p) {
        return this.db.prepare(sql).all(...p);
    }
    close() {
        this.db.close();
    }
}
export class MarketTriggerEngine {
    config;
    now;
    cooldown;
    debounce;
    db;
    pending = new Map();
    fired = new Map();
    ids = new Set();
    constructor(config) {
        this.config = config;
        for (const n of [
            config.cooldownMs ?? 0,
            config.debounceMs ?? 0,
            config.priceAbove,
            config.volumeAbove,
            config.liquidityAbove,
        ])
            if (n !== undefined && (!Number.isFinite(n) || n < 0))
                throw Error("invalid trigger configuration");
        this.now = config.now ?? Date.now;
        this.cooldown = config.cooldownMs ?? 0;
        this.debounce = config.debounceMs ?? 0;
        if (config.statePath) {
            this.db = new DatabaseSync(config.statePath);
            this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS trigger_ids(id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS trigger_pending(key TEXT PRIMARY KEY,start INTEGER NOT NULL,event TEXT NOT NULL,type TEXT NOT NULL); CREATE TABLE IF NOT EXISTS trigger_fired(key TEXT PRIMARY KEY,at INTEGER NOT NULL);");
        }
    }
    seen(id) {
        if (this.db) {
            const r = this.db
                .prepare("INSERT OR IGNORE INTO trigger_ids VALUES(?)")
                .run(id);
            return Number(r.changes) === 0;
        }
        if (this.ids.has(id))
            return true;
        this.ids.add(id);
        return false;
    }
    getFired(k) {
        if (this.db)
            return Number(this.db
                .prepare("SELECT at FROM trigger_fired WHERE key=?")
                .get(k)?.at ?? NaN);
        return this.fired.get(k);
    }
    emit(p) {
        const now = this.now(), last = this.getFired(p.key);
        if (last !== undefined &&
            Number.isFinite(last) &&
            now - last < this.cooldown)
            return [];
        if (this.db)
            this.db
                .prepare("INSERT INTO trigger_fired VALUES(?,?) ON CONFLICT(key) DO UPDATE SET at=excluded.at")
                .run(p.key, now);
        else
            this.fired.set(p.key, now);
        return [
            createEnvelope({
                type: p.type,
                source: "market-trigger",
                correlationId: p.event.correlationId,
                causationId: p.event.id,
                payload: { trigger: p.event.type, input: p.event.payload },
            }),
        ];
    }
    evaluate(e) {
        if (this.seen(e.id))
            return [];
        const p = e.payload;
        let type;
        const finite = (v) => typeof v === "number" && Number.isFinite(v);
        // A new token appearing on a launchpad. The event carries the mint that
        // launched; an event with no identifiable token is not a launch and is
        // dropped rather than fired on a blank key.
        if (e.type === "market.token.launch" &&
            typeof p.token === "string" &&
            p.token.length > 0)
            type = "trigger.token.launch";
        else if (e.type === "market.liquidity" &&
            finite(p.value) &&
            p.value >= (this.config.liquidityAbove ?? Infinity))
            type = "trigger.liquidity.threshold";
        else if (e.type === "market.price" &&
            finite(p.value) &&
            p.value >= (this.config.priceAbove ?? Infinity))
            type = "trigger.price.threshold";
        else if (e.type === "market.volume" &&
            finite(p.value) &&
            p.value >= (this.config.volumeAbove ?? Infinity))
            type = "trigger.volume.threshold";
        else if (e.type === "risk.alert")
            type = "trigger.risk.alert";
        else if (e.type === "policy.alert")
            type = "trigger.policy.alert";
        if (!type)
            return [];
        const key = `${type}:${String(p.symbol ?? p.token ?? "")}`, item = { start: this.now(), event: e, type, key };
        if (this.debounce > 0) {
            if (this.db)
                this.db
                    .prepare("INSERT INTO trigger_pending VALUES(?,?,?,?) ON CONFLICT(key) DO NOTHING")
                    .run(key, item.start, JSON.stringify(e, encode), type);
            else if (!this.pending.has(key))
                this.pending.set(key, item);
            return this.flush();
        }
        return this.emit(item);
    }
    flush() {
        const now = this.now(), due = [];
        if (this.db) {
            for (const r of this.db
                .prepare("SELECT * FROM trigger_pending WHERE start<=?")
                .all(now - this.debounce))
                due.push({
                    key: r.key,
                    start: r.start,
                    event: JSON.parse(r.event, decode),
                    type: r.type,
                });
            for (const p of due)
                this.db.prepare("DELETE FROM trigger_pending WHERE key=?").run(p.key);
        }
        else
            for (const [k, p] of this.pending)
                if (now - p.start >= this.debounce) {
                    due.push(p);
                    this.pending.delete(k);
                }
        return due.flatMap((p) => this.emit(p));
    }
    close() {
        this.db?.close();
    }
}
