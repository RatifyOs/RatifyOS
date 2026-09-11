import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, randomBytes, scrypt as scryptCallback, sign as ed25519Sign, timingSafeEqual, } from "node:crypto";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { dirname, parse, resolve as resolvePath } from "node:path";
import bs58 from "bs58";
import { enforceRealpathIdentity, permissionsAreUnsafe } from "../platform.js";
/**
 * scrypt N=2^15. Deliberately expensive so a stolen keystore file resists
 * offline guessing. The parameters are recorded in the file and re-validated
 * on unlock so a tampered file cannot downgrade the KDF.
 */
const KDF = { N: 32768, r: 8, p: 1, dkLen: 32 };
function validKdf(x) {
    if (!x || typeof x !== "object")
        return false;
    const k = x;
    return (Number.isSafeInteger(k.N) &&
        k.N >= 16384 &&
        k.N <= 262144 &&
        (k.N & (k.N - 1)) === 0 &&
        Number.isSafeInteger(k.r) &&
        k.r >= 1 &&
        k.r <= 16 &&
        Number.isSafeInteger(k.p) &&
        k.p >= 1 &&
        k.p <= 4 &&
        k.dkLen === 32 &&
        128 * k.N * k.r <= 512 * 1024 * 1024);
}
const scrypt = (password, salt, k = KDF) => new Promise((ok, fail) => scryptCallback(password, salt, k.dkLen, { N: k.N, r: k.r, p: k.p, maxmem: 512 * 1024 * 1024 }, (error, key) => (error ? fail(error) : ok(key))));
const HEX = /^[0-9a-f]+$/i;
function validCiphertext(x, bytes) {
    if (!x || typeof x !== "object")
        return false;
    const c = x;
    return (typeof c.iv === "string" &&
        c.iv.length === 24 &&
        HEX.test(c.iv) &&
        typeof c.tag === "string" &&
        c.tag.length === 32 &&
        HEX.test(c.tag) &&
        typeof c.ciphertext === "string" &&
        HEX.test(c.ciphertext) &&
        (bytes === undefined || c.ciphertext.length === bytes * 2));
}
function encrypt(key, plaintext) {
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv), ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
        iv: iv.toString("hex"),
        tag: cipher.getAuthTag().toString("hex"),
        ciphertext: ciphertext.toString("hex"),
    };
}
function decrypt(key, c) {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(c.iv, "hex"));
    decipher.setAuthTag(Buffer.from(c.tag, "hex"));
    return Buffer.concat([
        decipher.update(Buffer.from(c.ciphertext, "hex")),
        decipher.final(),
    ]);
}
export async function assertPrivatePath(path, label, exists) {
    const absolute = resolvePath(path), root = parse(absolute).root, immediate = dirname(absolute);
    let current = immediate;
    while (current !== root) {
        const st = await lstat(current);
        if (st.isSymbolicLink())
            throw Error(`${label}_parent_symlink_forbidden`);
        if (!st.isDirectory())
            throw Error(`${label}_parent_invalid`);
        const resolved = await realpath(current);
        if (enforceRealpathIdentity && resolved !== current)
            throw Error(`${label}_parent_symlink_forbidden`);
        if (current === immediate && permissionsAreUnsafe(st))
            throw Error(`${label}_parent_permissions_unsafe`);
        current = dirname(current);
    }
    if (exists) {
        const st = await lstat(absolute);
        if (st.isSymbolicLink())
            throw Error(`${label}_symlink_forbidden`);
        if (!st.isFile())
            throw Error(`${label}_format_invalid`);
        if (permissionsAreUnsafe(st))
            throw Error(`${label}_permissions_unsafe`);
    }
}
/** PKCS#8 prefix for a raw 32-byte Ed25519 seed (RFC 8410 OID 1.3.101.112). */
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
/** Derive the 32-byte Ed25519 public key from a 32-byte seed. */
function publicKeyFromSeed(seed) {
    const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
    try {
        const spki = createPublicKey(createPrivateKey({ key: der, format: "der", type: "pkcs8" })).export({ format: "der", type: "spki" });
        return Buffer.from(spki.subarray(spki.length - 32));
    }
    finally {
        der.fill(0);
    }
}
/**
 * Parse an operator-supplied Ed25519 secret into the canonical 64-byte
 * `seed || publicKey` form. Accepts the two formats real Solana tooling
 * emits — `solana-keygen`'s JSON byte array and wallet-exported base58 —
 * plus a bare 32-byte seed. Anything else is rejected rather than guessed.
 */
export function parseSecretKey(input) {
    const text = input.trim();
    let bytes;
    if (text.startsWith("[")) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        }
        catch {
            throw Error("secret_key_invalid");
        }
        if (!Array.isArray(parsed) ||
            !parsed.every((x) => Number.isInteger(x) && x >= 0 && x <= 255))
            throw Error("secret_key_invalid");
        bytes = Buffer.from(parsed);
    }
    else {
        try {
            bytes = Buffer.from(bs58.decode(text));
        }
        catch {
            throw Error("secret_key_invalid");
        }
    }
    if (bytes.length === 32) {
        const seed = bytes;
        const out = Buffer.concat([seed, publicKeyFromSeed(seed)]);
        seed.fill(0);
        return out;
    }
    if (bytes.length !== 64) {
        bytes.fill(0);
        throw Error("secret_key_invalid");
    }
    const seed = bytes.subarray(0, 32), claimed = bytes.subarray(32), derived = publicKeyFromSeed(seed);
    const consistent = derived.equals(claimed);
    derived.fill(0);
    if (!consistent) {
        bytes.fill(0);
        throw Error("secret_key_invalid");
    }
    return bytes;
}
/** Generate a fresh Ed25519 keypair. The secret never leaves this process. */
export function generateSecretKey() {
    const seed = randomBytes(32), out = Buffer.concat([seed, publicKeyFromSeed(seed)]);
    seed.fill(0);
    return out;
}
/**
 * Write a new mode-0600 keystore. Refuses to overwrite an existing file and
 * zeroes every intermediate buffer. Returns the base58 public key.
 */
export async function createEncryptedKeystore(path, secretKey, password) {
    if (secretKey.length !== 64)
        throw Error("secret_key_invalid");
    if (!password)
        throw Error("password_required");
    await assertPrivatePath(path, "keystore", false);
    const plain = Buffer.from(secretKey), salt = randomBytes(32), dek = randomBytes(32);
    let kek;
    try {
        const derived = publicKeyFromSeed(plain.subarray(0, 32));
        if (!derived.equals(plain.subarray(32)))
            throw Error("secret_key_invalid");
        kek = await scrypt(password, salt);
        const body = {
            version: 2,
            curve: "ed25519",
            publicKey: bs58.encode(derived),
            crypto: {
                cipher: "aes-256-gcm",
                kdf: "scrypt",
                kdfparams: { ...KDF },
                salt: salt.toString("hex"),
                wrappedDek: encrypt(kek, dek),
                secretKey: encrypt(dek, plain),
            },
        };
        const file = await open(path, "wx", 0o600);
        try {
            await file.writeFile(JSON.stringify(body));
            await file.sync();
        }
        finally {
            await file.close();
        }
        return body.publicKey;
    }
    finally {
        plain.fill(0);
        dek.fill(0);
        kek?.fill(0);
    }
}
export class KeystoreAccount {
    publicKey;
    secret;
    #dek;
    constructor(publicKey, secret, dek) {
        this.publicKey = publicKey;
        this.secret = secret;
        this.#dek = dek;
    }
    get locked() {
        return this.#dek === null;
    }
    /** Drop the data key. Subsequent signing attempts fail closed. */
    lock() {
        this.#dek?.fill(0);
        this.#dek = null;
    }
    signMessage(message) {
        const dek = this.#dek;
        if (!dek)
            throw Error("keystore_locked");
        const plain = decrypt(dek, this.secret);
        const der = Buffer.concat([
            PKCS8_ED25519_PREFIX,
            plain.subarray(0, 32),
        ]);
        try {
            // Node holds its own copy inside the KeyObject for the lifetime of the
            // handle; scoping it to this call is the tightest bound available
            // without a native secure-memory allocator.
            const key = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
            return new Uint8Array(ed25519Sign(null, Buffer.from(message), key));
        }
        finally {
            der.fill(0);
            plain.fill(0);
        }
    }
}
/**
 * Open and unlock a keystore. Failures below the structural checks are
 * deliberately opaque: a wrong passphrase, a tampered ciphertext and a
 * corrupt file are indistinguishable to the caller.
 */
export async function unlockKeystore(path, password) {
    let kek, dek, plain;
    try {
        await assertPrivatePath(path, "keystore", true);
        const body = JSON.parse(await readFile(path, "utf8"));
        if (body.version !== 2 ||
            body.curve !== "ed25519" ||
            body.crypto?.cipher !== "aes-256-gcm" ||
            body.crypto?.kdf !== "scrypt" ||
            typeof body.publicKey !== "string")
            throw Error("keystore_format_invalid");
        if (!validKdf(body.crypto.kdfparams))
            throw Error("keystore_kdf_invalid");
        if (!/^[0-9a-f]{64}$/i.test(body.crypto.salt) ||
            !validCiphertext(body.crypto.wrappedDek, 32) ||
            !validCiphertext(body.crypto.secretKey, 64))
            throw Error("keystore_format_invalid");
        kek = await scrypt(password, Buffer.from(body.crypto.salt, "hex"), body.crypto.kdfparams);
        dek = decrypt(kek, body.crypto.wrappedDek);
        plain = decrypt(dek, body.crypto.secretKey);
        const derived = publicKeyFromSeed(plain.subarray(0, 32)), claimed = bs58.decode(body.publicKey);
        if (claimed.length !== 32 ||
            !timingSafeEqual(derived, Buffer.from(claimed)) ||
            !derived.equals(plain.subarray(32)))
            throw Error("public key mismatch");
        return new KeystoreAccount(body.publicKey, body.crypto.secretKey, dek);
    }
    catch (error) {
        dek?.fill(0);
        if (error instanceof Error &&
            /permissions|format|symlink|kdf/.test(error.message))
            throw error;
        // Deliberately opaque: decryption failures must not leak which stage
        // failed (wrong password, tampered ciphertext, corrupt file).
        // eslint-disable-next-line preserve-caught-error
        throw Error("keystore_decryption_failed");
    }
    finally {
        kek?.fill(0);
        plain?.fill(0);
    }
}
