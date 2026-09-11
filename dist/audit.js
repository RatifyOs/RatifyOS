import { createHash } from "node:crypto";
const canonical = (value) => {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonical).join(",")}]`;
    return `{${Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
        .join(",")}}`;
};
const digest = (entry) => createHash("sha256").update(canonical(entry)).digest("hex");
export class AuditJournal {
    #entries = [];
    append(type, payload) {
        const base = {
            index: this.#entries.length,
            type,
            payload,
            previousHash: this.#entries.at(-1)?.hash ?? "GENESIS",
        };
        const entry = { ...base, hash: digest(base) };
        this.#entries.push(entry);
        return entry;
    }
    verify() {
        return this.#entries.every((e, i) => e.index === i &&
            e.previousHash === (this.#entries[i - 1]?.hash ?? "GENESIS") &&
            e.hash ===
                digest({
                    index: e.index,
                    type: e.type,
                    payload: e.payload,
                    previousHash: e.previousHash,
                }));
    }
    unsafeEntriesForTest() {
        return this.#entries;
    }
}
