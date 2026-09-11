import { DatabaseSync } from "node:sqlite";
/**
 * Durable one-time authorization fence.
 *
 * `consume` is an INSERT OR IGNORE, so an authorization id can be claimed
 * exactly once even across a signer restart or two concurrent connections.
 * `transition` is a compare-and-set on the current state, which is what makes
 * `claimed -> expired` and `claimed -> signed` mutually exclusive.
 */
export class SqliteReplayStore {
    db;
    constructor(path) {
        this.db = new DatabaseSync(path);
        this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS signer_replay(id TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,state TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,data TEXT,updated_at INTEGER NOT NULL,recovered INTEGER NOT NULL DEFAULT 0)`);
        const columns = this.db
            .prepare("PRAGMA table_info(signer_replay)")
            .all();
        if (!columns.some((x) => x.name === "recovered"))
            this.db.exec("ALTER TABLE signer_replay ADD COLUMN recovered INTEGER NOT NULL DEFAULT 0");
    }
    async consume(id, expiresAt) {
        if (!id || !Number.isSafeInteger(expiresAt))
            return false;
        return (this.db
            .prepare("INSERT OR IGNORE INTO signer_replay(id,expires_at,state,updated_at) VALUES(?,?,'claimed',?)")
            .run(id, expiresAt, Date.now()).changes === 1);
    }
    async transition(id, from, to, data) {
        return (this.db
            .prepare("UPDATE signer_replay SET state=?,data=?,version=version+1,updated_at=? WHERE id=? AND state=?")
            .run(to, data ?? null, Date.now(), id, from).changes === 1);
    }
    get(id) {
        return this.db
            .prepare("SELECT id,expires_at expiresAt,state,version,data,updated_at updatedAt,recovered FROM signer_replay WHERE id=?")
            .get(id);
    }
    /**
     * Release the signed bytes to exactly one caller. The `recovered=0`
     * predicate makes concurrent recovery attempts mutually exclusive.
     */
    recoverSigned(id) {
        return this.db
            .prepare("UPDATE signer_replay SET recovered=1,version=version+1,updated_at=? WHERE id=? AND state='signed' AND recovered=0 RETURNING data")
            .get(Date.now(), id);
    }
    list(states) {
        const q = states.map(() => "?").join(",");
        return this.db
            .prepare(`SELECT id,expires_at expiresAt,state,version,data,updated_at updatedAt FROM signer_replay WHERE state IN (${q})`)
            .all(...states);
    }
    close() {
        this.db.close();
    }
}
