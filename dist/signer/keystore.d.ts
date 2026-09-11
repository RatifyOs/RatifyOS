export type KdfParams = {
    N: number;
    r: number;
    p: number;
    dkLen: number;
};
/** AES-256-GCM ciphertext, hex encoded. */
type Ciphertext = {
    iv: string;
    tag: string;
    ciphertext: string;
};
/**
 * Envelope-encrypted Ed25519 keystore.
 *
 * A random 32-byte data key (DEK) encrypts the wallet secret; the DEK itself
 * is wrapped by a KEK derived from the passphrase via scrypt. The passphrase
 * is never stored — the wrapped DEK's GCM tag is what proves it correct.
 */
export type KeystoreFile = {
    version: 2;
    curve: "ed25519";
    publicKey: string;
    crypto: {
        cipher: "aes-256-gcm";
        kdf: "scrypt";
        kdfparams: KdfParams;
        salt: string;
        wrappedDek: Ciphertext;
        secretKey: Ciphertext;
    };
};
export declare function assertPrivatePath(path: string, label: string, exists: boolean): Promise<void>;
/**
 * Parse an operator-supplied Ed25519 secret into the canonical 64-byte
 * `seed || publicKey` form. Accepts the two formats real Solana tooling
 * emits — `solana-keygen`'s JSON byte array and wallet-exported base58 —
 * plus a bare 32-byte seed. Anything else is rejected rather than guessed.
 */
export declare function parseSecretKey(input: string): Uint8Array;
/** Generate a fresh Ed25519 keypair. The secret never leaves this process. */
export declare function generateSecretKey(): Uint8Array;
/**
 * Write a new mode-0600 keystore. Refuses to overwrite an existing file and
 * zeroes every intermediate buffer. Returns the base58 public key.
 */
export declare function createEncryptedKeystore(path: string, secretKey: Uint8Array, password: string): Promise<string>;
/**
 * An unlocked signing identity.
 *
 * Only the public key and the unwrapped DEK live in memory between calls; the
 * Ed25519 secret is decrypted inside `signMessage`, used once, and zeroed
 * immediately. It is never written anywhere and never appears in a log line.
 */
export interface SignerAccount {
    /** base58 Ed25519 public key */
    readonly publicKey: string;
    /** Raw 64-byte Ed25519 signature over `message`. */
    signMessage(message: Uint8Array): Uint8Array;
}
export declare class KeystoreAccount implements SignerAccount {
    #private;
    readonly publicKey: string;
    private readonly secret;
    constructor(publicKey: string, secret: Ciphertext, dek: Buffer);
    get locked(): boolean;
    /** Drop the data key. Subsequent signing attempts fail closed. */
    lock(): void;
    signMessage(message: Uint8Array): Uint8Array;
}
/**
 * Open and unlock a keystore. Failures below the structural checks are
 * deliberately opaque: a wrong passphrase, a tampered ciphertext and a
 * corrupt file are indistinguishable to the caller.
 */
export declare function unlockKeystore(path: string, password: string): Promise<KeystoreAccount>;
export {};
