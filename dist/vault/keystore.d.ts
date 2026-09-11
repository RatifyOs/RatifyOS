import { Secret } from "../kernel/secret.js";
export declare const WALLET_SECRET_ID = "wallet.primary";
export declare const DEFAULT_KEYSTORE_FILE = "keystore.json";
export type SecretKind = "wallet" | "llm_key" | "service_key";
/**
 * The on-machine, passphrase-locked keystore.
 *
 * Envelope encryption: a random 32-byte data key (DEK) encrypts every secret;
 * the DEK itself is wrapped by a KEK derived from the user's passphrase via
 * scrypt. Unlocking unwraps the DEK once and caches it in memory; per-secret
 * operations are local AES-256-GCM. The passphrase is never stored; the wrapped
 * DEK's GCM tag is what validates a correct passphrase. Nothing here ever leaves
 * the machine.
 */
export declare class Keystore {
    #private;
    private constructor();
    static exists(path: string): boolean;
    /** Create a brand-new keystore protected by `passphrase`. Throws if one already exists. */
    static init(path: string, passphrase: string): Keystore;
    /** Open an existing keystore and unlock it. A wrong passphrase fails the GCM tag and throws. */
    static unlock(path: string, passphrase: string): Keystore;
    get locked(): boolean;
    lock(): void;
    has(id: string): boolean;
    list(): {
        id: string;
        kind: SecretKind;
        last4: string | undefined;
    }[];
    put(id: string, kind: SecretKind, plaintext: Buffer | string): void;
    /** Decrypt a secret, run `fn` with the plaintext bytes, then zero them. Minimizes plaintext lifetime. */
    use<T>(id: string, fn: (bytes: Buffer) => T): T;
    /** Reveal a string secret as a Secret<string> (e.g. a BYOK key handed to a client). */
    reveal(id: string): Secret;
}
