import { type DecodedTransaction } from "./transaction.js";
/**
 * Signer-side policy, re-checked inside the signer for every transaction.
 *
 * This is the Solana port of the EVM policy the isolated signer used to
 * enforce. The mapping is deliberate:
 *
 *   chainId              -> cluster            (bound through the envelope)
 *   from allowlist       -> feePayers
 *   `to` allowlist       -> program allowlist
 *   calldata prefixes    -> instruction discriminators, scoped per program
 *   maxValue             -> caps, denominated in the *input leg*
 *   maxGas / fee ceiling -> compute unit limit / price / priority-fee ceilings
 *
 * Caps are denominated in the asset leaving the wallet, so no price oracle
 * sits in the safety path and no oracle manipulation can widen a limit.
 */
export declare const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
/** The literal asset key used for lamport-denominated caps. */
export declare const NATIVE_ASSET = "native";
export type AmountEncoding = "u64le" | "u32le";
export interface SignerSpendRule {
    /** `native`, or the base58 mint whose base units this instruction moves. */
    asset: string;
    /** byte offset of the input amount within the instruction data */
    amountOffset: number;
    amountEncoding: AmountEncoding;
    /**
     * Index into the instruction's own account list holding the mint. When set,
     * the signer verifies that account equals `asset` — so the operator's
     * pinned asset and the instruction's actual asset cannot diverge.
     */
    mintAccountIndex?: number;
}
/**
 * One allowed (program, instruction) pair.
 *
 * `effect` is mandatory and exhaustive: every allowed instruction is either
 * declared value-moving (`spend`, with a rule saying how to read the input
 * leg), declared fee-moving (`fee`, ComputeBudget only), or explicitly
 * declared incapable of moving value (`none`). There is no default — an
 * instruction the operator has not classified is refused.
 */
export type SignerProgramRule = {
    programId: string;
    /** lowercase hex prefix of the instruction data */
    discriminator: string;
} & ({
    effect: "none";
} | {
    effect: "fee";
} | {
    effect: "spend";
    spend: SignerSpendRule;
});
export interface SignPolicy {
    cluster: string;
    feePayers: readonly string[];
    programs: readonly SignerProgramRule[];
    /** asset -> maximum total base units that may leave the wallet per tx */
    caps: Readonly<Record<string, bigint>>;
    maxInstructions: number;
    maxAccountKeys: number;
    maxRequiredSignatures: number;
    maxComputeUnitLimit: number;
    maxComputeUnitPriceMicroLamports: bigint;
    maxPriorityFeeLamports: bigint;
    /**
     * Optional second priority-fee ceiling expressed in bps of the native input
     * leg, mirroring Aetheria. Only applied when the transaction actually has a
     * native input leg, so it never depends on a price.
     */
    maxPriorityFeeBps?: number;
    /**
     * Address lookup tables this policy permits. Empty (the default) means any
     * transaction carrying a lookup is refused, because the signer cannot
     * resolve looked-up addresses without trusting an external RPC.
     */
    addressLookupTables: readonly string[];
}
export interface LoadedSignPolicy extends SignPolicy {
    version: number;
    hash: string;
}
export interface PolicyEvaluation {
    /** total base units of each asset leaving the wallet */
    spend: ReadonlyMap<string, bigint>;
    computeUnitLimit: number;
    computeUnitPriceMicroLamports: bigint;
    priorityFeeLamports: bigint;
}
/**
 * Re-check a decoded transaction against the signer's own policy.
 *
 * Throws `policy_*` on the first violation. The host cannot talk the signer
 * into signing something this function rejects: every input is read out of
 * the wire bytes, and every limit comes from the operator's mode-0600 policy
 * file, not from the request.
 */
export declare function evaluatePolicy(decoded: DecodedTransaction, policy: SignPolicy, expectedFeePayer: string): PolicyEvaluation;
/**
 * Load and validate the signer policy from a mode-0600 regular file.
 *
 * The returned `hash` is the sha256 of the exact file bytes; the daemon binds
 * authorization envelopes to it so a policy swap invalidates in-flight
 * authorizations instead of silently widening what may be signed.
 */
export declare function loadSignPolicy(path: string): Promise<LoadedSignPolicy>;
