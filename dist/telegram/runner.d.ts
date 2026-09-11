import { type InboundEnvelope } from "../gateway/channels/index.js";
export interface TelegramOffsetStore {
    load(): Promise<number>;
    save(offset: number): Promise<void>;
}
export declare class FileTelegramOffsetStore implements TelegramOffsetStore {
    private path;
    constructor(path: string);
    load(): Promise<number>;
    save(n: number): Promise<void>;
}
type Fetch = (url: string, init?: RequestInit) => Promise<{
    ok: boolean;
    status?: number;
    headers?: {
        get(n: string): string | null;
    };
    json(): Promise<any>;
}>;
export declare class TelegramRunner {
    private o;
    private stopped;
    private channel;
    constructor(o: {
        token: string;
        store: TelegramOffsetStore;
        fetch: Fetch;
        allowedUserIds?: Set<string>;
        allowedChatIds?: Set<string>;
        dispatch: (x: InboundEnvelope) => Promise<string | void>;
        approval?: (x: InboundEnvelope) => Promise<string | void>;
        sleep?: (ms: number) => Promise<void>;
    });
    private url;
    check(): Promise<boolean>;
    pollOnce(): Promise<void>;
    run(): Promise<void>;
    stop(): void;
}
export {};
