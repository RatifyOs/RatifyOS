interface Entry {
    index: number;
    type: string;
    payload: unknown;
    previousHash: string;
    hash: string;
}
export declare class AuditJournal {
    #private;
    append(type: string, payload: unknown): Readonly<Entry>;
    verify(): boolean;
    unsafeEntriesForTest(): Entry[];
}
export {};
