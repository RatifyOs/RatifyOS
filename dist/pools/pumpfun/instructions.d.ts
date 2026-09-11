import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
/**
 * Bonding-curve `buy` / `sell` instruction construction.
 *
 * The account list is the volatile part of pump.fun — it has been extended three
 * times without a version bump in the instruction name — so it is expressed as an
 * ordered, named table rather than an inline array of `PublicKey`s. When pump
 * moves an account, you edit one row here and the tests that pin ordinal ↔ name
 * tell you immediately whether anything else shifted.
 *
 * This builds the **legacy `buy`/`sell`** pair, which covers SOL-paired coins on
 * the classic SPL Token program — the overwhelming majority of live curves. Coins
 * that need `buy_v2` (Token-2022 base mint, a non-SOL quote mint, mayhem or
 * cashback variants) are detected upstream and refused, never approximated.
 */
export interface PumpAccountSlot {
    readonly name: string;
    readonly pubkey: PublicKey;
    readonly isSigner: boolean;
    readonly isWritable: boolean;
}
export interface CurveIxContext {
    readonly user: PublicKey;
    readonly mint: PublicKey;
    /** `bonding_curve.creator`; required to derive `creator_vault`. */
    readonly creator: PublicKey;
    /** One of the `Global` account's fee recipients. */
    readonly feeRecipient: PublicKey;
    readonly programId?: PublicKey | undefined;
    readonly feeProgramId?: PublicKey;
    readonly tokenProgramId?: PublicKey;
}
/** `buy` account order, per `idl/pump.json`. Indices are load-bearing. */
export declare function buyAccounts(ctx: CurveIxContext): readonly PumpAccountSlot[];
/** `sell` account order. Note `creator_vault` sits **before** `token_program` here but after it in `buy`. */
export declare function sellAccounts(ctx: CurveIxContext): readonly PumpAccountSlot[];
/**
 * `buy(amount: u64, max_sol_cost: u64, track_volume: OptionBool)`.
 * `OptionBool` is a single-field tuple struct, i.e. one byte on the wire.
 */
export declare function buildBuyInstruction(args: {
    readonly ctx: CurveIxContext;
    readonly tokenAmount: bigint;
    readonly maxSolCostLamports: bigint;
    readonly trackVolume?: boolean;
}): TransactionInstruction;
/** `sell(amount: u64, min_sol_output: u64)`. */
export declare function buildSellInstruction(args: {
    readonly ctx: CurveIxContext;
    readonly tokenAmount: bigint;
    readonly minSolOutputLamports: bigint;
}): TransactionInstruction;
/** Idempotent ATA create for the user's token account — a no-op when it exists. */
export declare function ensureUserAtaInstruction(ctx: CurveIxContext): TransactionInstruction;
export interface BuiltTx {
    readonly unsignedTxBase64: string;
    readonly recentBlockhash: string;
    readonly priorityFeeLamports: number;
    readonly computeUnitLimit: number;
}
/**
 * Wrap instructions into an unsigned v0 transaction, base64 wire format — the one
 * canonical representation the kernel signs, persists and broadcasts.
 *
 * The priority fee is expressed as an exact lamport total and converted to a
 * per-CU micro-lamport price against the CU limit, so the number the intent
 * declares is the number the transaction actually pays. The kernel re-caps it
 * against policy anyway; this just means the two agree.
 */
export declare function buildUnsignedTx(args: {
    readonly payer: PublicKey;
    readonly instructions: readonly TransactionInstruction[];
    readonly recentBlockhash: string;
    readonly priorityFeeLamports: number;
    readonly computeUnitLimit?: number;
}): BuiltTx;
/** Deterministic fee-recipient pick from `Global`. Falls back to the primary when the rotation list is empty. */
export declare function pickFeeRecipient(recipients: readonly string[], primary: string, seed: number): PublicKey;
