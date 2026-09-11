/**
 * Secret<T> — a value that is structurally unloggable.
 *
 * The raw value lives in a true `#private` field, so it is never enumerable,
 * never serialized by JSON.stringify, and never printed by console.log /
 * util.inspect. The ONLY way to get the value out is `.reveal()`, which you call
 * at the exact point of use and never store. This keeps API keys and wallet
 * material out of logs by construction rather than by a redaction list someone
 * forgets to update.
 */
export declare class Secret<T = string> {
    #private;
    readonly label: string;
    /** Last 4 chars — only for high-entropy strings (>= 32 chars). Never for short/low-entropy values. */
    readonly last4: string | undefined;
    constructor(value: T, label?: string);
    /** Reveal the raw value. Call ONLY at the point of use; never assign the result to a field. */
    reveal(): T;
    /** Derive a new Secret without ever exposing the value to the caller. */
    map<U>(fn: (value: T) => U, label?: string): Secret<U>;
    toString(): string;
    toJSON(): string;
}
export declare function isSecret(value: unknown): value is Secret<unknown>;
