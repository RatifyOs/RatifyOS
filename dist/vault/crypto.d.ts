export interface KdfParams {
    readonly salt: string;
    readonly N: number;
    readonly r: number;
    readonly p: number;
    readonly keylen: number;
}
export interface Ciphertext {
    readonly iv: string;
    readonly authTag: string;
    readonly data: string;
}
/** scrypt N=2^15 — a deliberately expensive KDF so a stolen keystore file resists offline guessing. */
export declare function defaultKdfParams(): KdfParams;
export declare function deriveKek(passphrase: string, kdf: KdfParams): Buffer;
export declare function aesGcmEncrypt(key: Buffer, plaintext: Buffer): Ciphertext;
/** Decrypt. A wrong key (wrong passphrase) fails the GCM auth tag and throws. */
export declare function aesGcmDecrypt(key: Buffer, ct: Ciphertext): Buffer;
