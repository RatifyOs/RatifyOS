import { PublicKey } from "@solana/web3.js";
/**
 * pump.fun program constants, taken verbatim from the published IDL at
 * `github.com/pump-fun/pump-public-docs` (`idl/pump.json`, `idl/pump_fees.json`).
 *
 * Everything here is data, not behaviour, so the layout can be re-pinned to a new
 * program version by editing this file alone. That matters more than usual: pump
 * has changed the `buy`/`sell` account lists at least three times (creator vaults,
 * then volume accumulators, then the dynamic fee program), and a stale account
 * list does not fail loudly — it fails as a mangled transaction.
 */
export declare const PUMP_PROGRAM_ID: PublicKey;
export declare const PUMP_FEE_PROGRAM_ID: PublicKey;
/** Anchor sighashes. NB: PumpSwap (the post-migration AMM) reuses these — the program id disambiguates. */
export declare const BUY_DISCRIMINATOR: Uint8Array<ArrayBuffer>;
export declare const SELL_DISCRIMINATOR: Uint8Array<ArrayBuffer>;
/** Account discriminators (`sha256("account:<Name>")[0..8]`). */
export declare const BONDING_CURVE_DISCRIMINATOR: Uint8Array<ArrayBuffer>;
export declare const GLOBAL_DISCRIMINATOR: Uint8Array<ArrayBuffer>;
export declare const SEED_GLOBAL: Buffer<ArrayBuffer>;
export declare const SEED_BONDING_CURVE: Buffer<ArrayBuffer>;
export declare const SEED_CREATOR_VAULT: Buffer<ArrayBuffer>;
export declare const SEED_EVENT_AUTHORITY: Buffer<ArrayBuffer>;
export declare const SEED_GLOBAL_VOLUME_ACCUMULATOR: Buffer<ArrayBuffer>;
export declare const SEED_USER_VOLUME_ACCUMULATOR: Buffer<ArrayBuffer>;
export declare const SEED_FEE_CONFIG: Buffer<ArrayBuffer>;
/**
 * Total supply minted by every standard pump.fun launch: 1,000,000,000 tokens at
 * 6 decimals. Used only as a sanity check on a decoded curve — a mint whose
 * `tokenTotalSupply` disagrees is not a standard launch and gets refused.
 */
export declare const PUMP_TOTAL_SUPPLY = 1000000000000000n;
export declare const PUMP_TOKEN_DECIMALS = 6;
/**
 * Fallback fee split used only when the on-chain `FeeConfig` cannot be read. Since
 * the September 2025 change the real split is tiered by market cap, so this is a
 * *ceiling-ish* stand-in: 1% protocol + 0.05% creator was the pre-tier flat rate.
 * The maths module always prefers real tiers when they are supplied.
 */
export declare const FALLBACK_PROTOCOL_FEE_BPS = 100;
export declare const FALLBACK_CREATOR_FEE_BPS = 5;
