import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

let db: Database.Database | null = null;

export function getDb(extensionPath: string): Database.Database {
  if (db) return db;

  const dir = path.join(extensionPath, "pact-data");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(path.join(dir, "pact.db"));

  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      prompt_id   TEXT PRIMARY KEY,
      prompt_text TEXT NOT NULL,
      response    TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    )
  `);

  return db;
}