import { type DecodedTransaction } from "../signer/transaction.js";
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
export declare const SIMULATION_EVIDENCE_DOMAIN = "ari-solana-simulation-evidence/v1";
/** The literal asset key used for lamport-denominated movement. */
export declare const NATIVE_ASSET = "native";
/** What the caller hands the gateway: an already-built unsigned transaction. */
export interface PreparedTransaction {
    cluster: string;
    /** base64 unsigned wire transaction */
    transaction: string;
    /**
     * The block height past which `recentBlockhash` can no longer land. Solana
     * has no account nonce; this is the replay fence, and crossing it is
     * terminal — the intent is re-quoted from scratch, never re-signed.
     */
    lastValidBlockHeight: number;
}
export interface InstructionSummary {
    programId: string;
    /** base58 account keys; `null` where an address lookup table is involved */
    accounts: readonly (string | null)[];
    /** lowercase hex instruction data */
    data: string;
}
/**
 * A fully decoded, JSON-round-trippable description of one exact transaction.
 *
 * Every field is read out of the wire bytes by {@link decodeTransaction} — the
 * same decoder the isolated signer runs on its own side of the process
 * boundary — so an authorization built from this request describes exactly what
 * the signer will independently decode.
 */
export interface SimulationRequest {
    cluster: string;
    /** base64 canonical wire transaction */
    transaction: string;
    /** base64 message bytes — exactly what an Ed25519 signature commits to */
    message: string;
    /** `0x` sha256 of the message bytes — the request identity handle */
    messageHash: string;
    feePayer: string;
    recentBlockhash: string;
    lastValidBlockHeight: number;
    /** sorted unique program ids the transaction invokes */
    programIds: readonly string[];
    /** static account keys, in message order */
    accountKeys: readonly string[];
    instructions: readonly InstructionSummary[];
    /** address lookup table accounts referenced by the message */
    addressTableLookups: readonly string[];
    policyHash: string;
}
/** Signed base-unit movement of one asset for one owner. */
export interface AssetDelta {
    /** `native`, or the base58 mint */
    asset: string;
    /** base58 owner (for `native`, the account whose lamports moved) */
    owner: string;
    /** post - pre, in base units */
    amount: bigint;
}
/** Post-execution state of an account the simulation was asked to return. */
export interface AccountState {
    address: string;
    lamports: bigint;
    owner: string;
    /** base64 account data, or `null` when the account does not exist */
    data: string | null;
}
/**
 * What the node was actually able to tell us.
 *
 * These flags are part of the hashed evidence body, so a downgraded endpoint
 * can never produce evidence that hashes the same as a fully-observed run.
 */
export interface SimulationCapabilities {
    /** pre and post account state were both read, so `assetDeltas` is real */
    balances: boolean;
    /** program logs were returned */
    logs: boolean;
    /** `getFeeForMessage` answered, so `feeLamports` is real */
    fee: boolean;
    /** no address lookup table referenced by the message was left unresolved */
    addressTableLookups: boolean;
}
export interface SimulationResult {
    success: boolean;
    /** context slot the simulation observed */
    slot: bigint;
    /** the recent blockhash the transaction was simulated with */
    blockhash: string;
    messageHash: string;
    unitsConsumed: bigint;
    feeLamports: bigint;
    logs: readonly string[];
    accountStates: readonly AccountState[];
    assetDeltas: readonly AssetDelta[];
    capabilities: SimulationCapabilities;
    /** decoded `simulateTransaction` error, when `success` is false */
    err?: string;
}
export interface SimulationEvidence {
    hash: string;
    messageHash: string;
    slot: bigint;
    blockhash: string;
    unitsConsumed: bigint;
    feeLamports: bigint;
    logs: readonly string[];
    accountStates: readonly AccountState[];
    assetDeltas: readonly AssetDelta[];
    capabilities: SimulationCapabilities;
}
export interface SafetyContext {
    expectedMessageHash: string;
    /** how many slots the simulation may lag the current tip */
    maxSlotLag: bigint;
    currentSlot: bigint;
    /** asset keys (`native` or base58 mints) the trade is allowed to move */
    allowedAssets: ReadonlySet<string>;
    /**
     * Current cluster block height. Supplied together with
     * `lastValidBlockHeight`, this is the blockhash-expiry fence: past it the
     * transaction can never land and the intent is dead, not retryable.
     */
    currentBlockHeight?: number;
    lastValidBlockHeight?: number;
}
/**
 * Decode an exact unsigned transaction into a simulation request.
 *
 * The decode is deliberately the signer's own decoder: it rejects non-canonical
 * encodings and program ids hidden behind lookup tables, so nothing that the
 * signer would later refuse can be quoted, simulated and approved first.
 */
export declare function buildSimulationRequest(t: PreparedTransaction, policyHash: string): SimulationRequest;
/** The same projection, when the caller already holds a decode. */
export declare function simulationRequestOf(d: DecodedTransaction, cluster: string, lastValidBlockHeight: number, policyHash: string): SimulationRequest;
export declare function createSimulationEvidence(request: SimulationRequest, result: SimulationResult): SimulationEvidence;
export declare function simulationEvidenceHash(e: Omit<SimulationEvidence, "hash">): string;
/**
 * Refuse anything that is not positive, current, complete evidence of a safe
 * transaction.
 *
 * The capability checks come first and are not negotiable: a node that could
 * not read balances produces `balances: false`, and an empty `assetDeltas`
 * array from such a node is silence, not proof that nothing moved. Treating the
 * two as the same is exactly the failure this function exists to prevent.
 */
export declare function assertSimulationSafe(result: SimulationResult, context: SafetyContext): void;
