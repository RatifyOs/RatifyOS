import { createHash, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
const TYPES = new Set([
    "sign",
    "broadcast",
    "allowance",
    "bridge",
    "withdraw",
    "policy-change",
]);
const STATUSES = new Set([
    "pending",
    "approved",
    "denied",
    "expired",
    "revoked",
    "consumed",
]);
const object = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
export function canonicalSerialize(v, seen = new Set()) {
    if (v === null ||
        typeof v === "string" ||
        typeof v === "boolean" ||
        (typeof v === "number" && Number.isFinite(v)))
        return JSON.stringify(v);
    if (Array.isArray(v)) {
        if (seen.has(v))
            throw Error("Transaction is not serializable");
        seen.add(v);
        const s = `[${v.map((x) => canonicalSerialize(x, seen)).join(",")}]`;
        seen.delete(v);
        return s;
    }
    if (object(v)) {
        if (seen.has(v))
            throw Error("Transaction is not serializable");
        seen.add(v);
        const s = `{${Object.keys(v)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonicalSerialize(v[k], seen)}`)
            .join(",")}}`;
        seen.delete(v);
        return s;
    }
    throw Error("Transaction is not serializable");
}
export const canonicalHash = (v) => createHash("sha256")
    .update("approval-v1\0")
    .update(canonicalSerialize(v))
    .digest("hex");
const boundKeys = (i) => ({
    chain: i.chain,
    transactionHash: canonicalHash(i.serializedTransaction),
    intentHash: i.intentHash,
    policyHash: i.policyHash,
    policyVersion: i.policyVersion,
    simulationHash: i.simulationHash,
    simulationBlock: i.simulationBlock,
    simulationState: i.simulationState,
    account: i.account,
    nonce: i.nonce,
    value: i.value,
    calldata: i.calldata,
    router: i.router,
});
const text = (v, n, max = 4096) => {
    if (typeof v !== "string" || !v.trim() || v.length > max)
        throw Error(`Invalid ${n}`);
};
export class ApprovalEngine {
    db;
    clock;
    operators;
    closed = false;
    verify;
    configVersion;
    configHash;
    constructor(path, options) {
        this.clock = options.clock ?? Date.now;
        this.configVersion = options.operatorConfigVersion ?? "legacy";
        text(this.configVersion, "operator config version", 128);
        this.verify = options.verifyDecisionProof ?? (() => false);
        this.operators = new Map();
        for (const o of options.operators) {
            text(o.id, "operator id", 128);
            if (this.operators.has(o.id))
                throw Error("Duplicate operator");
            if (new Set(o.roles).size !== o.roles.length ||
                new Set(o.scopes).size !== o.scopes.length)
                throw Error("Duplicate operator role or scope");
            this.operators.set(o.id, Object.freeze({ ...o, roles: [...o.roles], scopes: [...o.scopes] }));
        }
        this.configHash = canonicalHash([...this.operators.values()].sort((a, b) => a.id.localeCompare(b.id)));
        this.db = new DatabaseSync(path);
        this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON");
        this.db.exec(`CREATE TABLE IF NOT EXISTS approval_requests(id TEXT PRIMARY KEY,type TEXT NOT NULL CHECK(type IN ('sign','broadcast','allowance','bridge','withdraw','policy-change')),proposer_id TEXT NOT NULL,binding_json TEXT NOT NULL,tx_json TEXT NOT NULL,display_impact TEXT,expires_at INTEGER NOT NULL,quorum INTEGER NOT NULL CHECK(quorum>0),challenge TEXT UNIQUE NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','approved','denied','expired','revoked','consumed')),revision INTEGER NOT NULL CHECK(revision>=0),created_at INTEGER NOT NULL,config_version TEXT NOT NULL,config_hash TEXT NOT NULL);CREATE TABLE IF NOT EXISTS approval_decisions(sequence INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT NOT NULL REFERENCES approval_requests(id),operator_id TEXT NOT NULL,decision TEXT NOT NULL CHECK(decision IN ('approve','deny')),challenge TEXT NOT NULL,nonce TEXT UNIQUE NOT NULL,reason TEXT,created_at INTEGER NOT NULL,proof TEXT,UNIQUE(request_id,operator_id));CREATE TABLE IF NOT EXISTS approval_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT NOT NULL REFERENCES approval_requests(id),event TEXT NOT NULL,operator_id TEXT,reason TEXT,binding_hash TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL);CREATE TRIGGER IF NOT EXISTS decisions_no_update BEFORE UPDATE ON approval_decisions BEGIN SELECT RAISE(ABORT,'decisions are append-only');END;CREATE TRIGGER IF NOT EXISTS decisions_no_delete BEFORE DELETE ON approval_decisions BEGIN SELECT RAISE(ABORT,'decisions are append-only');END;CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON approval_events BEGIN SELECT RAISE(ABORT,'events are append-only');END;CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON approval_events BEGIN SELECT RAISE(ABORT,'events are append-only');END;`);
    }
    open() {
        if (this.closed)
            throw Error("Approval engine is closed");
    }
    raw(id) {
        return this.db
            .prepare("SELECT * FROM approval_requests WHERE id=?")
            .get(id);
    }
    validate(i) {
        text(i.id, "request id", 128);
        text(i.proposerId, "proposer id", 128);
        text(i.chain, "chain", 128);
        for (const k of ["intentHash", "policyHash", "simulationHash"])
            text(i[k], `${k} hash`, 256);
        for (const k of [
            "policyVersion",
            "simulationBlock",
            "simulationState",
            "account",
            "nonce",
            "value",
            "calldata",
            "router",
        ])
            text(i[k], k, 8192);
        if (!Number.isSafeInteger(i.expiresAt))
            throw Error("Invalid expiry");
        if (!object(i.serializedTransaction) ||
            !("to" in i.serializedTransaction) ||
            !("data" in i.serializedTransaction) ||
            !("value" in i.serializedTransaction) ||
            !("nonce" in i.serializedTransaction))
            throw Error("Invalid canonical transaction");
    }
    request(input, options) {
        this.open();
        this.validate(input);
        if (Object.prototype.hasOwnProperty.call(options, "challenge"))
            throw Error("Caller-supplied challenge is forbidden");
        if (!TYPES.has(input.type))
            throw Error("Invalid request type");
        const eligible = [...this.operators.values()].filter((o) => o.id !== input.proposerId &&
            o.roles.includes("approver") &&
            (o.scopes.includes("*") || o.scopes.includes(input.type))).length;
        if (!Number.isInteger(options.quorum) ||
            options.quorum < 1 ||
            options.quorum > eligible)
            throw Error("Invalid or infeasible quorum");
        if (input.expiresAt <= this.clock())
            throw Error("Request already expired");
        const challenge = randomBytes(32).toString("hex");
        const tx = canonicalSerialize(input.serializedTransaction), binding = canonicalSerialize(boundKeys(input)), now = this.clock();
        this.db
            .prepare("INSERT INTO approval_requests VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            .run(input.id, input.type, input.proposerId, binding, tx, input.displayImpact ?? null, input.expiresAt, options.quorum, challenge, "pending", 0, now, this.configVersion, this.configHash);
        this.event(input.id, "created", null, null, binding, 0, now);
        return this.get(input.id);
    }
    event(id, event, operator, reason, binding, revision, at = this.clock()) {
        this.db
            .prepare("INSERT INTO approval_events(request_id,event,operator_id,reason,binding_hash,revision,created_at) VALUES(?,?,?,?,?,?,?)")
            .run(id, event, operator, reason, canonicalHash(JSON.parse(binding)), revision, at);
    }
    map(r) {
        if (!STATUSES.has(String(r.status)))
            throw Error("Corrupt approval status");
        let b, tx;
        try {
            b = JSON.parse(String(r.binding_json));
            tx = JSON.parse(String(r.tx_json));
        }
        catch {
            throw Error("Corrupt approval data");
        }
        if (canonicalHash(tx) !== b.transactionHash)
            throw Error("Corrupt transaction binding");
        return {
            id: String(r.id),
            type: String(r.type),
            proposerId: String(r.proposer_id),
            ...b,
            serializedTransaction: tx,
            expiresAt: Number(r.expires_at),
            ...(r.display_impact === null
                ? {}
                : { displayImpact: String(r.display_impact) }),
            quorum: Number(r.quorum),
            challenge: String(r.challenge),
            status: String(r.status),
            revision: Number(r.revision),
            createdAt: Number(r.created_at),
        };
    }
    expire(r) {
        const out = this.db
            .prepare("UPDATE approval_requests SET status='expired',revision=revision+1 WHERE id=? AND revision=? AND status IN ('pending','approved')")
            .run(String(r.id), Number(r.revision));
        if (Number(out.changes))
            this.event(String(r.id), "expired", null, "deadline reached", String(r.binding_json), Number(r.revision) + 1);
    }
    get(id) {
        this.open();
        let r = this.raw(id);
        if (!r)
            return undefined;
        if ((r.status === "pending" || r.status === "approved") &&
            Number(r.expires_at) <= this.clock()) {
            this.db.exec("BEGIN IMMEDIATE");
            try {
                this.expire(r);
                this.db.exec("COMMIT");
            }
            catch (e) {
                this.db.exec("ROLLBACK");
                throw e;
            }
            r = this.raw(id);
        }
        return this.map(r);
    }
    operator(id, type) {
        const o = this.operators.get(id);
        if (!o ||
            !o.roles.includes("approver") ||
            !(o.scopes.includes("*") || o.scopes.includes(type)))
            throw Error("Operator lacks approver role or scope");
        return o;
    }
    decide(id, input) {
        this.open();
        text(input.nonce, "decision nonce", 256);
        if (input.decision !== "approve" && input.decision !== "deny")
            throw Error("Invalid decision");
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const r = this.raw(id);
            if (!r)
                throw Error("Unknown approval");
            if (Number(r.expires_at) <= this.clock())
                throw Error("Approval expired");
            if (r.status !== "pending")
                throw Error(`Approval is ${r.status}`);
            if (Number(r.revision) !== input.expectedRevision)
                throw Error("Revision conflict");
            if (input.operatorId === r.proposer_id)
                throw Error("Self-approval is forbidden");
            this.operator(input.operatorId, String(r.type));
            if (input.challenge !== r.challenge)
                throw Error("Challenge mismatch");
            const timestamp = input.timestamp ?? this.clock();
            if (!Number.isSafeInteger(timestamp) ||
                Math.abs(this.clock() - timestamp) > 300000)
                throw Error("Invalid proof timestamp");
            if (!input.proof ||
                !this.verify({
                    ...input,
                    requestId: id,
                    revision: input.expectedRevision,
                    timestamp,
                    operatorConfigVersion: String(r.config_version),
                    operatorConfigHash: String(r.config_hash),
                }))
                throw Error("Invalid decision proof");
            if (this.db
                .prepare("SELECT 1 FROM approval_decisions WHERE request_id=? AND operator_id=?")
                .get(id, input.operatorId))
                throw Error("Distinct operator required");
            try {
                this.db
                    .prepare("INSERT INTO approval_decisions(request_id,operator_id,decision,challenge,nonce,reason,created_at,proof) VALUES(?,?,?,?,?,?,?,?)")
                    .run(id, input.operatorId, input.decision, input.challenge, input.nonce, input.reason ?? null, this.clock(), input.proof ?? null);
            }
            catch (e) {
                if (String(e).toLowerCase().includes("nonce"))
                    throw new Error("Decision nonce replay", { cause: e });
                throw e;
            }
            const count = Number(this.db
                .prepare("SELECT count(*) n FROM approval_decisions WHERE request_id=? AND decision='approve'")
                .get(id).n);
            const status = input.decision === "deny"
                ? "denied"
                : count >= Number(r.quorum)
                    ? "approved"
                    : "pending";
            this.db
                .prepare("UPDATE approval_requests SET status=?,revision=revision+1 WHERE id=? AND revision=?")
                .run(status, id, input.expectedRevision);
            if (status !== "pending")
                this.event(id, status, input.operatorId, input.reason ?? null, String(r.binding_json), input.expectedRevision + 1);
            this.db.exec("COMMIT");
            return this.get(id);
        }
        catch (e) {
            try {
                this.db.exec("ROLLBACK");
            }
            catch { }
            throw e;
        }
    }
    decisions(id) {
        this.open();
        return this.db
            .prepare("SELECT operator_id operatorId,decision,challenge,nonce,reason,created_at createdAt FROM approval_decisions WHERE request_id=? ORDER BY sequence")
            .all(id);
    }
    audit(id) {
        this.open();
        return this.db
            .prepare("SELECT event,operator_id operatorId,reason,binding_hash bindingHash,revision,created_at createdAt FROM approval_events WHERE request_id=? ORDER BY sequence")
            .all(id).map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== null)));
    }
    revoke(id, input) {
        this.open();
        text(input.reason, "reason", 2048);
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const r = this.raw(id);
            if (!r)
                throw Error("Unknown approval");
            this.operator(input.operatorId, String(r.type));
            if (Number(r.revision) !== input.expectedRevision)
                throw Error("Revision conflict");
            if (r.status !== "pending" && r.status !== "approved")
                throw Error(`Approval is ${r.status}`);
            const out = this.db
                .prepare("UPDATE approval_requests SET status='revoked',revision=revision+1 WHERE id=? AND revision=? AND status IN ('pending','approved')")
                .run(id, input.expectedRevision);
            if (Number(out.changes) !== 1)
                throw Error("Revision conflict");
            this.event(id, "revoked", input.operatorId, input.reason, String(r.binding_json), input.expectedRevision + 1);
            this.db.exec("COMMIT");
            return this.get(id);
        }
        catch (e) {
            try {
                this.db.exec("ROLLBACK");
            }
            catch { }
            throw e;
        }
    }
    consume(id, input) {
        this.open();
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const r = this.raw(id);
            if (!r)
                throw Error("Unknown approval");
            if (Number(r.expires_at) <= this.clock()) {
                this.expire(r);
                this.db.exec("COMMIT");
                throw Error("Approval expired");
            }
            if (r.status !== "approved")
                throw Error(`Approval is ${r.status}`);
            if (canonicalSerialize(boundKeys(input)) !== String(r.binding_json))
                throw Error("Exact transaction mismatch");
            const out = this.db
                .prepare("UPDATE approval_requests SET status='consumed',revision=revision+1 WHERE id=? AND revision=? AND status='approved'")
                .run(id, Number(r.revision));
            if (Number(out.changes) !== 1)
                throw Error("Approval consumption conflict");
            this.event(id, "consumed", null, null, String(r.binding_json), Number(r.revision) + 1);
            this.db.exec("COMMIT");
            return this.get(id);
        }
        catch (e) {
            try {
                if (this.raw(id)?.status !== "expired")
                    this.db.exec("ROLLBACK");
            }
            catch { }
            throw e;
        }
    }
    unsafeDatabaseForTests() {
        return this.db;
    }
    close() {
        if (!this.closed) {
            this.db.close();
            this.closed = true;
        }
    }
}
