import { type SimulationRequest, type SimulationResult } from "./simulation.js";
/**
 * Solana simulation over raw JSON-RPC.
 *
 * This is a rewrite rather than a port, because the EVM safety story does not
 * survive the move. `eth_call` pinned to a block hash (EIP-1898), `debug_traceCall`
 * with a call tracer, and state overrides all have no Solana equivalent:
 *
 *   - **No pinned state.** `simulateTransaction` runs against whatever the node
 *     currently holds. The best available honesty is to read the pre-state at a
 *     known slot, pass `minContextSlot` so the simulation cannot run *behind*
 *     that read, and bound how far it may have advanced. Provenance therefore
 *     records `pinned: false`. Nothing here claims otherwise.
 *   - **No trace.** Asset movement is derived from pre/post account state:
 *     lamports for native, and the SPL token account amount field for mints.
 *     That is why the pre-state read exists at all — `simulateTransaction`
 *     returns only post-execution accounts.
 *   - **`replaceRecentBlockhash: false`, always.** Letting the node substitute a
 *     live blockhash would simulate a *different message* than the one being
 *     authorized, and would hide exactly the expiry this system treats as
 *     terminal.
 *   - **`sigVerify` only when it can mean something.** A pre-authorization
 *     transaction is unsigned, so signature verification is off; a transaction
 *     that already carries every required signature is verified.
 *
 * Where the node cannot answer, this class raises a coded
 * {@link RpcSimulationError}. It never returns a successful result with empty
 * evidence — an empty `assetDeltas` from a node that could not read accounts is
 * silence, and policy downstream would read it as "nothing moved".
 */
type Fetch = typeof fetch;
type Commitment = "processed" | "confirmed" | "finalized";
export declare class RpcSimulationError extends Error {
    code: string;
    constructor(code: string, message?: string);
}
/** Genesis hashes are the only self-describing cluster identity Solana has. */
export declare const CLUSTER_GENESIS_HASHES: Readonly<Record<string, string>>;
export interface RpcSimulatorOptions {
    url: string;
    cluster: string;
    /**
     * Expected genesis hash. Defaults to the well-known hash for `cluster`; an
     * unknown cluster name (a local validator, say) must supply one explicitly
     * rather than silently skipping the check.
     */
    genesisHash?: string;
    fetch?: Fetch;
    timeoutMs?: number;
    maxResponseBytes?: number;
    commitment?: Commitment;
    /** how far the simulation may advance past the pre-state read */
    maxSlotDrift?: number;
    /** refuse to observe more writable accounts than this rather than sampling */
    maxObservedAccounts?: number;
    /**
     * Address lookup tables the operator has pinned — the same list the signer
     * policy pins. A message referencing any other table is refused, because
     * resolving it would mean asking an RPC which addresses a transaction
     * touches and then trusting the answer.
     */
    addressLookupTables?: readonly string[];
}
export interface SimulationProvenance {
    provider: "solana-json-rpc";
    url: string;
    cluster: string;
    genesisHash: string;
    commitment: Commitment;
    /** always false: Solana simulation cannot be pinned to a slot */
    pinned: false;
    preSlot: number;
    slot: number;
    sigVerify: boolean;
    replaceRecentBlockhash: false;
    observedAccounts: readonly string[];
    /** tables whose addresses were resolved by asking this RPC */
    lookupTablesResolvedByRpc: readonly string[];
    observedAt: string;
}
/**
 * Render `simulateTransaction`'s error union as a stable, loggable string.
 *
 * The EVM analogue decoded `Error(string)` / `Panic(uint)` / custom selectors;
 * Solana's equivalent is a small tagged union, of which `InstructionError` with
 * a `Custom` program code is by far the most common.
 */
export declare function decodeSimulationError(err: unknown): string;
export declare class RpcSimulator {
    private o;
    private id;
    constructor(o: RpcSimulatorOptions);
    private rpc;
    private get commitment();
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
    private lookupTables;
    /** Every writable account the message can mutate, in message order. */
    private writableAccounts;
    simulate(q: SimulationRequest): Promise<SimulationResult & {
        provenance: SimulationProvenance;
    }>;
}
export {};
