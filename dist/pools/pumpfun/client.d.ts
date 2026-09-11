import { PublicKey } from "@solana/web3.js";
import type { ChainReader } from "../chain.js";
import { type BondingCurveAccount, type GlobalAccount } from "./curve.js";
import { type CurveReserves, type Fees } from "./math.js";
/**
 * Reads the live state of a pump.fun bonding curve.
 *
 * One RPC round trip (`getMultipleAccounts` over curve + global + fee config)
 * yields everything needed to quote a trade: reserves, the creator that seeds the
 * `creator_vault` PDA, the rotating fee recipients, and the market-cap-tiered fee
 * split introduced in September 2025. Nothing here signs or builds a transaction.
 */
export interface CurveState extends CurveReserves {
    readonly mint: string;
    readonly curveAddress: string;
    readonly creator: string | undefined;
    readonly feeBps: bigint;
    readonly fees: Fees;
    readonly feeSource: "tiered" | "flat" | "global" | "fallback";
    readonly marketCapLamports: bigint;
    readonly uiPriceSol: number;
    readonly progressPct: number;
    readonly tokenDecimals: number;
    readonly tokenProgramId: string;
    /** True when the coin is quoted in native SOL — the only shape this package trades. */
    readonly solPaired: boolean;
    readonly isMayhemMode: boolean | undefined;
    readonly isCashbackCoin: boolean | undefined;
    readonly global: GlobalAccount;
    readonly raw: BondingCurveAccount;
}
export interface PumpFunClientOptions {
    readonly programId?: PublicKey;
    readonly feeProgramId?: PublicKey;
}
export declare class PumpFunClient {
    #private;
    constructor(chain: ChainReader, opts?: PumpFunClientOptions);
    get programId(): PublicKey;
    /** Curve PDA for a mint. Cheap and offline — safe to call before knowing the curve exists. */
    curveAddressFor(mint: string): string;
    /**
     * Full curve state, or `null` when the mint has no pump.fun curve at all (i.e.
     * it was never a pump launch — a different thing from "migrated", which returns
     * state with `complete: true` so the caller can route it to Jupiter knowingly).
     */
    readCurve(mint: string): Promise<CurveState | null>;
    getLatestBlockhash(): Promise<import("../chain.js").Blockhash>;
}
export declare const TOKEN_2022_PROGRAM: string;
