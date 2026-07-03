import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const db = new Database('luz.db');

db.pragma('journal_mode = WAL');

// Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    force_reset INTEGER DEFAULT 1,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    document TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    architect TEXT,
    salesperson TEXT,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL UNIQUE,
    unit_price REAL
  );
`);

// Create Default Admin
const checkAdmin = db.prepare('SELECT id FROM users WHERE is_admin = 1').get();
if (!checkAdmin) {
  const adminId = crypto.randomUUID();
  const hash = bcrypt.hashSync('142536', 10);
  db.prepare(`
    INSERT INTO users (id, name, email, password, is_admin, is_active, force_reset, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin', 'admin@luz.com', hash, 1, 1, 0, Date.now());
}
