export declare function newId(prefix: string): string;
export declare function newTradeId(): string;
export declare function newReservationId(): string;
/**
 * A server-generated, high-entropy idempotency key.
 *
 * NEVER derive this from client-controllable input (a chat message id is
 * predictable; deriving from it lets an attacker pre-register a key to block or
 * replay a trade). This is the only sanctioned way to mint an idempotency key.
 */
export declare function newIdempotencyKey(): string;
