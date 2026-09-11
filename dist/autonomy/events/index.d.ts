export type Finality = "unsafe" | "safe" | "finalized";
export interface ChainPosition {
    number: bigint;
    hash: string;
    parentHash: string;
    finality: Finality;
}
export interface Provenance {
    provider: string;
    observedAt: string;
    [key: string]: unknown;
}
export interface EventEnvelope<T = unknown> {
    readonly id: string;
    readonly type: string;
    readonly version: number;
    readonly source: string;
    readonly correlationId: string;
    readonly causationId?: string;
    readonly occurredAt: string;
    readonly block?: ChainPosition;
    readonly provenance?: Provenance;
    readonly payload: T;
}
export type EnvelopeInput<T> = {
    type: string;
    payload: T;
    source: string;
    version?: number;
    correlationId?: string;
    causationId?: string;
    block?: ChainPosition;
    provenance?: Provenance;
    now?: () => Date;
    id?: () => string;
};
export declare function createEnvelope<T>(input: EnvelopeInput<T>): EventEnvelope<T>;
export declare function reorgCorrection(original: EventEnvelope, canonical: ChainPosition): EventEnvelope<{
    orphanedEventId: string;
    orphanedBlockHash: string;
    canonicalBlockHash: string;
    canonicalBlockNumber: bigint;
    reversal: boolean;
}>;
export interface StoredEvent {
    cursor: number;
    envelope: EventEnvelope;
}
export interface HandlerTransaction {
    idempotencyKey: string;
    execute(sql: string, ...params: unknown[]): unknown;
    query(sql: string, ...params: unknown[]): unknown[];
}
type Handler = (event: EventEnvelope, tx: HandlerTransaction) => void | Promise<void>;
export type Options = {
    types?: string[];
    filter?: (event: EventEnvelope) => boolean;
    limit?: number;
    subscriptionVersion?: string;
};
export interface EventBus {
    publish(event: EventEnvelope): Promise<StoredEvent>;
    subscribe(name: string, handler: Handler, options?: Options): () => void;
    deliver(): Promise<void>;
    replay(cursor: number, options?: Options): Promise<StoredEvent[]>;
    offset(consumer: string): Promise<number>;
}
export declare class InMemoryEventBus implements EventBus {
    private events;
    private subscriptions;
    private offsets;
    private chains;
    subscribe(name: string, handler: Handler, options?: Options): () => boolean;
    private enqueue;
    publish(envelope: EventEnvelope): Promise<{
        cursor: number;
        envelope: EventEnvelope<unknown>;
    }>;
    deliver(): Promise<void>;
    private process;
    private matches;
    replay(cursor: number, o?: Options): Promise<StoredEvent[]>;
    offset(c: string): Promise<number>;
}
export interface EventSchema {
    latest: number;
    validate: (payload: unknown) => boolean;
    upcast?: (payload: unknown, version: number) => unknown;
}
export interface SqliteBusConfig {
    maxAttempts?: number;
    batchSize?: number;
    schemas?: Record<string, EventSchema>;
}
export declare class SqliteEventBus implements EventBus {
    private path;
    private config;
    private db;
    private subscriptions;
    private maxAttempts;
    private batchSize;
    constructor(path: string, config?: SqliteBusConfig);
    private normalize;
    subscribe(name: string, handler: Handler, options?: Options): () => boolean;
    private serialized;
    publish(input: EventEnvelope): Promise<{
        cursor: number;
        envelope: EventEnvelope<unknown>;
    }>;
    private matches;
    private tx;
    private process;
    deliver(): Promise<void>;
    replay(cursor: number, o?: Options): Promise<StoredEvent[]>;
    offset(c: string): Promise<number>;
    deadLetters(c?: string): unknown[];
    execute(sql: string, ...p: unknown[]): import("node:sqlite").StatementResultingChanges;
    query(sql: string, ...p: unknown[]): unknown[];
    close(): void;
}
export interface TriggerConfig {
    now?: () => number;
    cooldownMs?: number;
    debounceMs?: number;
    priceAbove?: number;
    volumeAbove?: number;
    liquidityAbove?: number;
    statePath?: string;
}
export declare class MarketTriggerEngine {
    private config;
    private now;
    private cooldown;
    private debounce;
    private db?;
    private pending;
    private fired;
    private ids;
    constructor(config: TriggerConfig);
    private seen;
    private getFired;
    private emit;
    evaluate(e: EventEnvelope): EventEnvelope[];
    flush(): EventEnvelope<{
        trigger: string;
        input: unknown;
    }>[];
    close(): void;
}
export {};
