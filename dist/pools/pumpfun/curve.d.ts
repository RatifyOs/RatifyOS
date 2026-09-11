import { PublicKey } from "@solana/web3.js";
import type { CurveReserves, FeeTier, Fees } from "./math.js";
/**
 * Account derivation and decoding for pump.fun's bonding curve.
 *
 * Decoding is written to survive the program's own history. Curve accounts grew
 * over time — 49 bytes originally, then +32 for `creator`, now 115 with the
 * mayhem/cashback flags and `quote_mint` — and old curves were never migrated. So
 * every field past `complete` is read only if the buffer is long enough, and its
 * absence is reported as `undefined` rather than defaulted to a lie.
 */
export declare function globalPda(programId?: PublicKey): PublicKey;
export declare function bondingCurvePda(mint: PublicKey, programId?: PublicKey): PublicKey;
export declare function creatorVaultPda(creator: PublicKey, programId?: PublicKey): PublicKey;
export declare function eventAuthorityPda(programId?: PublicKey): PublicKey;
export declare function globalVolumeAccumulatorPda(programId?: PublicKey): PublicKey;
export declare function userVolumeAccumulatorPda(user: PublicKey, programId?: PublicKey): PublicKey;
/**
 * `fee_config` lives under the **fee** program, seeded by the *pump* program's
 * 32 bytes. Two program ids in one derivation is easy to get backwards, which is
 * why `curve.test.ts` pins the seed bytes against the published IDL constant.
 */
export declare function feeConfigPda(pumpProgramId?: PublicKey, feeProgramId?: PublicKey): PublicKey;
/** The curve's own token account — a plain ATA owned by the curve PDA. */
export declare function associatedBondingCurve(mint: PublicKey, curve: PublicKey, tokenProgramId?: PublicKey): PublicKey;
export declare function associatedTokenAccount(mint: PublicKey, owner: PublicKey, tokenProgramId?: PublicKey): PublicKey;
export declare class CurveDecodeError extends Error {
}
export interface BondingCurveAccount extends CurveReserves {
    /** Creator, needed to derive `creator_vault`. Undefined on pre-creator-fee curves. */
    readonly creator: string | undefined;
    readonly isMayhemMode: boolean | undefined;
    readonly isCashbackCoin: boolean | undefined;
    /**
     * `Pubkey::default()` (all zeroes) means SOL-paired. Any other value means the
     * coin is quoted in a different SPL token and needs `buy_v2`, which this package
     * does not build — the caller must refuse rather than mis-price it.
     */
    readonly quoteMint: string | undefined;
    readonly rawLength: number;
}
/**
 * Decode a `BondingCurve` account. Note the IDL names the SOL fields
 * `virtual_quote_reserves` / `real_quote_reserves` since the multi-quote upgrade;
 * for a SOL-paired coin they *are* the lamport reserves, and this decoder surfaces
 * them under the SOL names the maths module uses.
 */
export declare function decodeBondingCurve(data: Uint8Array | Buffer): BondingCurveAccount;
/** True when the coin is quoted in native SOL (the only shape this package trades). */
export declare function isSolPaired(curve: BondingCurveAccount): boolean;
export interface GlobalAccount {
    readonly authority: string;
    readonly feeRecipient: string;
    readonly initialVirtualTokenReserves: bigint;
    readonly initialVirtualSolReserves: bigint;
    readonly initialRealTokenReserves: bigint;
    readonly tokenTotalSupply: bigint;
    readonly feeBasisPoints: bigint;
    readonly creatorFeeBasisPoints: bigint | undefined;
    /** The 7 rotating fee recipients, when the account is long enough to hold them. */
    readonly feeRecipients: readonly string[];
}
export declare function decodeGlobal(data: Uint8Array | Buffer): GlobalAccount;
export interface FeeConfigAccount {
    readonly flatFees: Fees;
    readonly feeTiers: readonly FeeTier[];
}
/** Decode the fee program's `FeeConfig`: `bump(1) admin(32) flat_fees(24) fee_tiers(vec)`. */
export declare function decodeFeeConfig(data: Uint8Array | Buffer): FeeConfigAccount;
