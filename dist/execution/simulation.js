import { createHash } from "node:crypto";
import { decodeTransaction, isPublicKey, } from "../signer/transaction.js";
/**
 * Solana simulation vocabulary.
 *
 * The EVM version of this module pinned an exact block (`eth_call` at a block
 * hash) and derived asset movement from a call trace. Solana has neither: a
 * simulation runs against whatever state the node currently holds, and the only
 * account movement it can report is the post-execution state of accounts you
 * asked for by name. So the mapping is:
 *
 *   block hash pin      -> none. Slot drift is bounded and *recorded*, never
 *                          claimed as a pin.
 *   nonce               -> recent blockhash + `lastValidBlockHeight`
 *   gasUsed             -> compute units consumed
 *   gas price ceiling   -> `getFeeForMessage` lamports
 *   trace asset deltas  -> pre/post account balances (native lamports and SPL
 *                          token amounts) around the simulation
 *   revert reason       -> `simulateTransaction`'s `err`
 *
 * Because several of those are things a node may simply decline to provide,
 * every result carries an explicit {@link SimulationCapabilities} record and
 * {@link assertSimulationSafe} refuses to pass a result whose evidence was not
 * actually collected. An empty `assetDeltas` array means "nothing moved"; it
 * must never be reachable by a node that could not tell us.
 */
export const SIMULATION_EVIDENCE_DOMAIN = "ari-solana-simulation-evidence/v1";
/** The literal asset key used for lamport-denominated movement. */
export const NATIVE_ASSET = "native";
const sha256 = (value) => `0x${createHash("sha256").update(value).digest("hex")}`;
/**
 * Decode an exact unsigned transaction into a simulation request.
 *
 * The decode is deliberately the signer's own decoder: it rejects non-canonical
 * encodings and program ids hidden behind lookup tables, so nothing that the
 * signer would later refuse can be quoted, simulated and approved first.
 */
export function buildSimulationRequest(t, policyHash) {
    if (!Number.isSafeInteger(t.lastValidBlockHeight) ||
        t.lastValidBlockHeight < 0)
        throw Error("prepared_last_valid_block_height_invalid");
    if (typeof t.cluster !== "string" || !t.cluster)
        throw Error("prepared_cluster_invalid");
    return simulationRequestOf(decodeTransaction(t.transaction), t.cluster, t.lastValidBlockHeight, policyHash);
}
/** The same projection, when the caller already holds a decode. */
export function simulationRequestOf(d, cluster, lastValidBlockHeight, policyHash) {
    return {
        cluster,
        transaction: d.wireBase64,
        message: d.messageBase64,
        messageHash: d.messageHash,
        feePayer: d.feePayer,
        recentBlockhash: d.recentBlockhash,
        lastValidBlockHeight,
        programIds: [...new Set(d.instructions.map((i) => i.programId))].sort(),
        accountKeys: [...d.staticAccountKeys],
        instructions: d.instructions.map((i) => ({
            programId: i.programId,
            accounts: [...i.accounts],
            data: i.dataHex,
        })),
        addressTableLookups: d.addressTableLookups.map((l) => l.accountKey),
        policyHash,
    };
}
const canonical = (value) => typeof value === "bigint"
    ? value.toString()
    : Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === "object"
            ? Object.fromEntries(Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, canonical(v)]))
            : value;
const evidenceBody = (result) => ({
    domain: SIMULATION_EVIDENCE_DOMAIN,
    messageHash: result.messageHash,
    slot: result.slot,
    blockhash: result.blockhash,
    unitsConsumed: result.unitsConsumed,
    feeLamports: result.feeLamports,
    logs: [...result.logs],
    accountStates: [...result.accountStates],
    assetDeltas: [...result.assetDeltas],
    capabilities: result.capabilities,
});
export function createSimulationEvidence(request, result) {
    if (result.messageHash.toLowerCase() !== request.messageHash.toLowerCase())
        throw Error("simulation_transaction_mismatch");
    const body = evidenceBody(result);
    return { ...body, hash: sha256(JSON.stringify(canonical(body))) };
}
export function simulationEvidenceHash(e) {
    return sha256(JSON.stringify(canonical({ domain: SIMULATION_EVIDENCE_DOMAIN, ...e })));
}
/**
 * Refuse anything that is not positive, current, complete evidence of a safe
 * transaction.
 *
 * The capability checks come first and are not negotiable: a node that could
 * not read balances produces `balances: false`, and an empty `assetDeltas`
 * array from such a node is silence, not proof that nothing moved. Treating the
 * two as the same is exactly the failure this function exists to prevent.
 */
export function assertSimulationSafe(result, context) {
    if (!result.success)
        throw Error(`simulation_failed${result.err ? `:${result.err}` : ""}`);
    const c = result.capabilities;
    if (!c || typeof c !== "object")
        throw Error("simulation_capabilities_absent");
    if (!c.balances)
        throw Error("simulation_balances_unavailable");
    if (!c.fee)
        throw Error("simulation_fee_unavailable");
    if (!c.logs)
        throw Error("simulation_logs_unavailable");
    if (!c.addressTableLookups)
        throw Error("simulation_address_table_lookup_unresolved");
    if (!isPublicKey(result.blockhash))
        throw Error("simulation_blockhash_invalid");
    if (result.messageHash.toLowerCase() !==
        context.expectedMessageHash.toLowerCase())
        throw Error("simulation_transaction_mismatch");
    if (result.slot > context.currentSlot ||
        context.currentSlot - result.slot > context.maxSlotLag)
        throw Error("simulation_stale_slot");
    // Blockhash expiry is terminal. Checking it here means an expired intent is
    // refused before an authorization is ever issued for it.
    if (context.currentBlockHeight !== undefined &&
        context.lastValidBlockHeight !== undefined &&
        context.currentBlockHeight > context.lastValidBlockHeight)
        throw Error("simulation_blockhash_expired");
    const seen = new Set();
    for (const d of result.assetDeltas) {
        const k = `${d.asset}:${d.owner}`;
        if (seen.has(k))
            throw Error("simulation_duplicate_asset_delta");
        seen.add(k);
        if (!context.allowedAssets.has(d.asset))
            throw Error(`unexpected_asset_delta:${d.asset}`);
    }
}
