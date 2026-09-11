import { DatabaseSync } from "node:sqlite";
const inspect = (path, create) => {
    const db = new DatabaseSync(path);
    try {
        db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
        const integrity = String(db.prepare("PRAGMA integrity_check").get().integrity_check);
        const journalMode = create
            ? String(db.prepare("PRAGMA journal_mode=WAL").get().journal_mode)
            : String(db.prepare("PRAGMA journal_mode").get().journal_mode);
        const tables = Number(db
            .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'")
            .get().n);
        return { path, exists: true, integrity, journalMode, tables };
    }
    finally {
        db.close();
    }
};
export function checkDatabases(paths) {
    return paths.map((path) => inspect(path, false));
}
export function migrateDatabases(paths) {
    return paths.map((path) => inspect(path, true));
}
export function databaseStatus(paths) {
    return paths.map((path) => inspect(path, false));
}
