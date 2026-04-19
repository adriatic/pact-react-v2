import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

let db: Database.Database | null = null;

type Migration = {
  version: number;
  description: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema: responses table",
    sql: `
      CREATE TABLE IF NOT EXISTS responses (
        prompt_id   TEXT PRIMARY KEY,
        prompt_text TEXT NOT NULL,
        response    TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );
    `,
  },
  {
    version: 2,
    description: "Add image support to responses",
    sql: `
      ALTER TABLE responses ADD COLUMN image_data      TEXT;
      ALTER TABLE responses ADD COLUMN image_mime_type TEXT;
    `,
  },
  {
    version: 3,
    description: "Add model and cell_type to responses",
    sql: `
      ALTER TABLE responses ADD COLUMN model     TEXT NOT NULL DEFAULT 'gpt';
      ALTER TABLE responses ADD COLUMN cell_type TEXT NOT NULL DEFAULT 'user';
    `,
  },
];

function getSchemaVersion(database: Database.Database): number {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    )
  `);

  const row = database
    .prepare("SELECT version FROM schema_version")
    .get() as { version: number } | undefined;

  if (!row) {
    database.prepare("INSERT INTO schema_version (version) VALUES (0)").run();
    return 0;
  }

  return row.version;
}

function runMigrations(database: Database.Database): void {
  const current = getSchemaVersion(database);

  const pending = migrations.filter(m => m.version > current);

  if (pending.length === 0) return;

  for (const migration of pending) {
    console.log(`PACT DB: applying migration v${migration.version} — ${migration.description}`);

    database.exec(migration.sql);

    database
      .prepare("UPDATE schema_version SET version = ?")
      .run(migration.version);
  }
}

export function getDb(extensionPath: string): Database.Database {
  if (db) return db;

  const dir = path.join(extensionPath, "pact-data");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(path.join(dir, "pact.db"));

  runMigrations(db);

  return db;
}