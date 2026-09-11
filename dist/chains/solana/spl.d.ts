import { PublicKey, TransactionInstruction } from "@solana/web3.js";
/** SPL Token program (legacy). */
export declare const TOKEN_PROGRAM_ID: PublicKey;
/** SPL Token-2022 program (Token Extensions). */
export declare const TOKEN_2022_PROGRAM_ID: PublicKey;
/** SPL Associated Token Account program. */
export declare const ASSOCIATED_TOKEN_PROGRAM_ID: PublicKey;
/**
 * Derives an associated token account address.
 *
 * The token program is a **seed**, not just the eventual owner, so a Token-2022
 * mint derives a different ATA than a legacy one for the same wallet. Callers
 * that support both must pass the mint's actual program — defaulting to legacy
 * on a Token-2022 mint silently produces an address the token program will
 * refuse to initialise.
 *
 * Uses `findProgramAddressSync`, matching the library's `allowOwnerOffCurve`
 * behaviour: the owner is not required to be a system-owned (on-curve) address,
 * which is what lets a PDA such as a pump.fun bonding curve hold an ATA.
 */
export declare function associatedTokenAddress(mint: PublicKey, owner: PublicKey, tokenProgramId?: PublicKey): PublicKey;
/**
 * Builds an ATA `CreateIdempotent` instruction.
 *
 * Argument order and defaults mirror the upstream helper this replaces, so call
 * sites did not have to change. `associatedToken` is passed in rather than
 * derived so the caller keeps one address for both the instruction and the
 * account list of the transaction it is being prepended to.
 */
export declare function createAssociatedTokenAccountIdempotentInstruction(payer: PublicKey, associatedToken: PublicKey, owner: PublicKey, mint: PublicKey, programId?: PublicKey, associatedTokenProgramId?: PublicKey): TransactionInstruction;
