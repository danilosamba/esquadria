import Database from 'better-sqlite3';
const db = new Database('luz.db');
try {
    db.prepare("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'M'").run();
    print("Migration successful");
} catch (e) {
    print("Migration failed or column already exists: " + e.message);
}
