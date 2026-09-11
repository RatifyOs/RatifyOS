import bs58 from "bs58";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, } from "../chains/solana/spl.js";
import { AddressLookupTableAccount, PublicKey, } from "@solana/web3.js";
import { decodeTransaction } from "../signer/transaction.js";
import { NATIVE_ASSET, } from "./simulation.js";
export class RpcSimulationError extends Error {
    code;
    constructor(code, message = code) {
        super(message);
        this.code = code;
    }
}
/** Genesis hashes are the only self-describing cluster identity Solana has. */
export const CLUSTER_GENESIS_HASHES = {
    "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
    devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
    testnet: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY",
};
const clean = (u) => {
    const x = new URL(u);
    x.username = "";
    x.password = "";
    x.search = "";
    return x.toString();
};
const TOKEN_PROGRAMS = new Set([
    TOKEN_PROGRAM_ID.toBase58(),
    TOKEN_2022_PROGRAM_ID.toBase58(),
]);
/** SPL token account layout: mint[0..32] owner[32..64] amount u64le[64..72]. */
const SPL_ACCOUNT_BYTES = 165;
/**
 * Render `simulateTransaction`'s error union as a stable, loggable string.
 *
 * The EVM analogue decoded `Error(string)` / `Panic(uint)` / custom selectors;
 * Solana's equivalent is a small tagged union, of which `InstructionError` with
 * a `Custom` program code is by far the most common.
 */
export function decodeSimulationError(err) {
    if (err === null || err === undefined)
        return "failed";
    if (typeof err === "string")
        return err;
    if (typeof err !== "object")
        return String(err);
    const [tag, value] = Object.entries(err)[0] ?? [];
    if (!tag)
        return "failed";
    if (tag === "InstructionError" && Array.isArray(value)) {
        const [index, detail] = value;
        const rendered = typeof detail === "string"
            ? detail
            : detail && typeof detail === "object"
                ? Object.entries(detail)
                    .map(([k, v]) => `${k}(${String(v)})`)
                    .join(",")
                : String(detail);
        return `InstructionError(${index},${rendered})`;
    }
    return value === undefined || value === null
        ? tag
        : `${tag}(${JSON.stringify(value).slice(0, 128)})`;
}
const accountData = (a) => !a
    ? Buffer.alloc(0)
    : Buffer.from(typeof a.data === "string" ? a.data : (a.data[0] ?? ""), "base64");
const stateOf = (address, a) => ({
    address,
    lamports: a ? BigInt(a.lamports) : 0n,
    owner: a?.owner ?? "",
    data: a ? accountData(a).toString("base64") : null,
});
/** Decode an SPL token account into (mint, owner, amount), or undefined. */
function tokenAccount(a) {
    if (!a || !TOKEN_PROGRAMS.has(a.owner))
        return undefined;
    const data = accountData(a);
    // Token-2022 accounts carry extensions past the base layout; the base fields
    // are at fixed offsets in both programs.
    if (data.length < SPL_ACCOUNT_BYTES)
        return undefined;
    return {
        mint: bs58.encode(data.subarray(0, 32)),
        owner: bs58.encode(data.subarray(32, 64)),
        amount: data.readBigUInt64LE(64),
    };
}
export class RpcSimulator {
    o;
    id = 0;
    constructor(o) {
        this.o = o;
    }
    async rpc(m, p) {
        const ac = new AbortController(), t = setTimeout(() => ac.abort(), this.o.timeoutMs ?? 10_000);
        try {
            const r = await (this.o.fetch ?? fetch)(this.o.url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: ++this.id,
                    method: m,
                    params: p,
                }),
                signal: ac.signal,
            });
            const text = await r.text();
            if (Buffer.byteLength(text) > (this.o.maxResponseBytes ?? 2_000_000))
                throw new RpcSimulationError("response_too_large");
            const b = JSON.parse(text);
            if (b.error)
                throw new RpcSimulationError("rpc_error", b.error.message ?? `rpc_${b.error.code}`);
            return b.result;
        }
        catch (e) {
            if (e.name === "AbortError")
                throw new RpcSimulationError("timeout");
            throw e;
        }
        finally {
            clearTimeout(t);
        }
    }
    get commitment() {
        return this.o.commitment ?? "confirmed";
    }
    /**
     * Resolve the message's address lookup tables, or refuse.
     *
     * Refusing is the default and the safe answer: a lookup table turns "which
     * accounts does this transaction touch" into a question only an RPC can
     * answer, and this simulator's whole output is a safety claim about exactly
     * that. When the operator has pinned a table, the addresses are fetched and
     * the fact that an RPC supplied them is recorded in provenance so it is
     * visible in the evidence rather than assumed away.
     */
    async lookupTables(q) {
        if (!q.addressTableLookups.length)
            return [];
        const pinned = new Set(this.o.addressLookupTables ?? []);
        for (const key of q.addressTableLookups)
            if (!pinned.has(key))
                throw new RpcSimulationError("address_table_lookup_unpinned", `address lookup table ${key} is not pinned by the operator`);
        const response = await this.rpc("getMultipleAccounts", [
            [...q.addressTableLookups],
            { encoding: "base64", commitment: this.commitment },
        ]);
        const values = response?.value ?? [];
        return q.addressTableLookups.map((key, i) => {
            const account = values[i] ?? null;
            if (!account)
                throw new RpcSimulationError("address_table_lookup_missing", `address lookup table ${key} not found`);
            try {
                return new AddressLookupTableAccount({
                    key: new PublicKey(key),
                    state: AddressLookupTableAccount.deserialize(accountData(account)),
                });
            }
            catch {
                throw new RpcSimulationError("address_table_lookup_invalid", `address lookup table ${key} could not be decoded`);
            }
        });
    }
    /** Every writable account the message can mutate, in message order. */
    writableAccounts(message, tables) {
        const keys = message.getAccountKeys(tables.length ? { addressLookupTableAccounts: tables } : undefined);
        const out = [];
        for (let i = 0; i < keys.length; i++)
            if (message.isAccountWritable(i)) {
                const key = keys.get(i);
                if (key)
                    out.push(key.toBase58());
            }
        const unique = [...new Set(out)], max = this.o.maxObservedAccounts ?? 64;
        if (unique.length > max)
            throw new RpcSimulationError("observed_accounts_exceeded", `${unique.length} writable accounts exceeds the ${max} this simulator will observe`);
        return unique;
    }
    async simulate(q) {
        const expectedGenesis = this.o.genesisHash ?? CLUSTER_GENESIS_HASHES[this.o.cluster];
        if (!expectedGenesis)
            throw new RpcSimulationError("cluster_unknown", `no genesis hash known for cluster ${this.o.cluster}; supply genesisHash`);
        if (q.cluster !== this.o.cluster)
            throw new RpcSimulationError("cluster_mismatch");
        const genesisHash = await this.rpc("getGenesisHash", []);
        if (genesisHash !== expectedGenesis)
            throw new RpcSimulationError("cluster_mismatch");
        const decoded = decodeTransaction(q.transaction);
        if (decoded.messageHash !== q.messageHash)
            throw new RpcSimulationError("transaction_mismatch");
        // Verify signatures only when they all exist; an unsigned transaction
        // being simulated before authorization has none, and asking the node to
        // verify absent signatures would fail for the wrong reason.
        const sigVerify = decoded.signatures.every((s) => s !== null);
        const tables = await this.lookupTables(q), addresses = this.writableAccounts(decoded.transaction.message, tables);
        const pre = await this.rpc("getMultipleAccounts", [
            addresses,
            { encoding: "base64", commitment: this.commitment },
        ]);
        const preSlot = Number(pre?.context?.slot);
        if (!Number.isSafeInteger(preSlot))
            throw new RpcSimulationError("context_slot_invalid");
        const preAccounts = pre?.value ?? [];
        const sim = await this.rpc("simulateTransaction", [
            q.transaction,
            {
                encoding: "base64",
                commitment: this.commitment,
                sigVerify,
                // Never substitute a live blockhash: that would simulate a different
                // message than the one being authorized, and would mask expiry.
                replaceRecentBlockhash: false,
                minContextSlot: preSlot,
                innerInstructions: false,
                accounts: { encoding: "base64", addresses },
            },
        ]);
        const slot = Number(sim?.context?.slot);
        if (!Number.isSafeInteger(slot))
            throw new RpcSimulationError("context_slot_invalid");
        if (slot < preSlot)
            throw new RpcSimulationError("slot_regressed");
        if (slot - preSlot > (this.o.maxSlotDrift ?? 150))
            throw new RpcSimulationError("slot_drift_exceeded");
        const value = sim?.value ?? {}, logs = value.logs ?? null, postAccounts = value.accounts ?? null, unitsConsumed = BigInt(Math.max(0, Number(value.unitsConsumed ?? 0)));
        const provenance = {
            provider: "solana-json-rpc",
            url: clean(this.o.url),
            cluster: this.o.cluster,
            genesisHash,
            commitment: this.commitment,
            pinned: false,
            preSlot,
            slot,
            sigVerify,
            replaceRecentBlockhash: false,
            observedAccounts: addresses,
            lookupTablesResolvedByRpc: tables.map((t) => t.key.toBase58()),
            observedAt: new Date().toISOString(),
        };
        if (value.err) {
            // A failing simulation is a complete answer on its own: there is no
            // asset movement to evidence, and callers reject on `success` first.
            return {
                success: false,
                slot: BigInt(slot),
                blockhash: q.recentBlockhash,
                messageHash: q.messageHash,
                unitsConsumed,
                feeLamports: 0n,
                logs: logs ?? [],
                accountStates: [],
                assetDeltas: [],
                capabilities: {
                    balances: false,
                    logs: logs !== null,
                    fee: false,
                    addressTableLookups: true,
                },
                err: decodeSimulationError(value.err),
                provenance,
            };
        }
        // Past this point the transaction is claimed to succeed, so every piece of
        // safety evidence must actually exist. Missing evidence is a coded error,
        // never an empty array.
        if (!Array.isArray(postAccounts))
            throw new RpcSimulationError("account_states_unavailable", "simulateTransaction returned no account states; asset deltas cannot be derived");
        if (postAccounts.length !== addresses.length)
            throw new RpcSimulationError("account_states_incomplete");
        if (logs === null)
            throw new RpcSimulationError("logs_unavailable", "no program logs");
        const fee = await this.rpc("getFeeForMessage", [
            q.message,
            { commitment: this.commitment },
        ]);
        // A null fee means the cluster no longer knows this blockhash, so the
        // transaction cannot land. Refusing is both the safe and the accurate
        // answer; quoting a fee of zero would be neither.
        if (fee?.value === null || fee?.value === undefined)
            throw new RpcSimulationError("fee_unavailable", "getFeeForMessage returned no fee; the recent blockhash is unknown to this cluster");
        const totals = new Map();
        const add = (asset, owner, amount) => {
            if (amount === 0n)
                return;
            const key = `${asset}:${owner}`, prior = totals.get(key);
            if (prior)
                totals.set(key, { ...prior, amount: prior.amount + amount });
            else
                totals.set(key, { asset, owner, amount });
        };
        const accountStates = [];
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i], before = preAccounts[i] ?? null, after = postAccounts[i] ?? null;
            accountStates.push(stateOf(address, after));
            add(NATIVE_ASSET, address, BigInt(after?.lamports ?? 0) - BigInt(before?.lamports ?? 0));
            const post = tokenAccount(after);
            if (!post)
                continue;
            const prior = tokenAccount(before);
            // A token account that changed mint or owner is not the same account;
            // treating its balance as a delta would be nonsense.
            if (prior && (prior.mint !== post.mint || prior.owner !== post.owner))
                throw new RpcSimulationError("token_account_identity_changed");
            add(post.mint, post.owner, post.amount - (prior?.amount ?? 0n));
        }
        const capabilities = {
            balances: true,
            logs: true,
            fee: true,
            addressTableLookups: true,
        };
        return {
            success: true,
            slot: BigInt(slot),
            blockhash: q.recentBlockhash,
            messageHash: q.messageHash,
            unitsConsumed,
            feeLamports: BigInt(fee.value),
            logs,
            accountStates,
            assetDeltas: [...totals.values()],
            capabilities,
            provenance,
        };
    }
}
