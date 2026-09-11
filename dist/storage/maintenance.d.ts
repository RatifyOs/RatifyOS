export interface DatabaseStatus {
    path: string;
    exists: boolean;
    integrity: string;
    journalMode: string;
    tables: number;
}
export declare function checkDatabases(paths: string[]): DatabaseStatus[];
export declare function migrateDatabases(paths: string[]): DatabaseStatus[];
export declare function databaseStatus(paths: string[]): DatabaseStatus[];
