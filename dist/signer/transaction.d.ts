import { VersionedTransaction } from "@solana/web3.js";
/**
 * Independent Solana transaction decoding.
 *
 * The signer never trusts the host's description of what it is being asked to
 * sign. Everything the policy and the envelope check is read out of the wire
 * bytes here, by this process, before any signature exists.
 */
export interface DecodedInstruction {
    /** base58 program id — always a *static* account key (see `decodeTransaction`). */
    programId: string;
    programIdIndex: number;
    accountIndexes: readonly number[];
    /**
     * base58 account keys for this instruction. `null` marks an index that
     * resolves through an address lookup table and therefore cannot be
     * verified without trusting an external RPC.
     */
    accounts: readonly (string | null)[];
    data: Uint8Array;
    /** lowercase hex of `data`, for policy prefix matching and envelope binding. */
    dataHex: string;
}
export interface DecodedAddressTableLookup {
    accountKey: string;
    writableIndexes: readonly number[];
    readonlyIndexes: readonly number[];
}
export interface DecodedTransaction {
    version: "legacy" | number;
    /** base58 fee payer — static account key 0, the first required signer. */
    feePayer: string;
    recentBlockhash: string;
    numRequiredSignatures: number;
    staticAccountKeys: readonly string[];
    /** base58 signatures already present on the wire; `null` for empty slots. */
    signatures: readonly (string | null)[];
    addressTableLookups: readonly DecodedAddressTableLookup[];
    instructions: readonly DecodedInstruction[];
    /** the exact bytes an Ed25519 signature commits to */
    messageBytes: Uint8Array;
    messageBase64: string;
    /** `0x`-prefixed sha256 of `messageBytes` — the request identity handle. */
    messageHash: string;
    /** canonical re-serialization of the whole transaction */
    wireBase64: string;
    transaction: VersionedTransaction;
}
export declare const sha256Hex: (bytes: Uint8Array) => string;
/**
 * Decode a base64 Solana transaction.
 *
 * Rejects, before anything else happens:
 *  - anything that is not a well-formed `VersionedTransaction`
 *  - non-canonical encodings (the re-serialization must be byte-identical, so
 *    two different wire encodings can never map to one authorized message)
 *  - an instruction whose program id is not a *static* account key. A program
 *    id behind an address lookup table would be unverifiable here, so the
 *    signer refuses to sign it regardless of what the runtime would accept.
 *  - a message with no instructions, or with no account keys.
 */
export declare function decodeTransaction(wireBase64: string): DecodedTransaction;
/**
 * Attach `signature` to `decoded` in the fee payer's slot and return the
 * base64 wire transaction plus its base58 signature.
 *
 * The signature is written only into the slot the signer owns; any co-signer
 * slot already present on the wire is preserved untouched.
 */
export declare function attachSignature(decoded: DecodedTransaction, signature: Uint8Array): {
    transaction: string;
    signature: string;
};
/** Read the base58 fee-payer signature off a signed wire transaction. */
export declare function signatureOf(wireBase64: string): string;
/** True when `value` is a well-formed base58 32-byte public key. */
export declare function isPublicKey(value: unknown): value is string;
