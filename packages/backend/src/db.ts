// node:sqlite is a built-in module in Node 22+ with no native bindings required. The experimental warning is expected.
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "bountyagents.db");

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (!db) {
    if (DB_PATH !== ":memory:") {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new DatabaseSync(DB_PATH);
    migrate(db);
  }
  return db;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      bounty_amount TEXT NOT NULL,
      bounty_token TEXT NOT NULL DEFAULT 'ETH',
      poster_address TEXT NOT NULL,
      poster_agent_id TEXT NOT NULL,
      worker_address TEXT,
      worker_agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      accepted_at INTEGER,
      completed_at INTEGER,
      verified_at INTEGER,
      tx_hash TEXT,
      completion_proof TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_poster ON tasks(poster_agent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_worker ON tasks(worker_agent_id);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined;
  }
}
