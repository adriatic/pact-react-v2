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
  {
    version: 4,
    description: "Add notebooks, discussions, parent-child relationships",
    sql: `
      CREATE TABLE IF NOT EXISTS notebooks (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        is_system  INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS discussions (
        id            TEXT PRIMARY KEY,
        notebook_id   TEXT NOT NULL,
        parent_id     TEXT,
        name          TEXT NOT NULL,
        created_at    INTEGER NOT NULL,
        total_time_ms INTEGER NOT NULL DEFAULT 0
      );

      ALTER TABLE responses ADD COLUMN discussion_id TEXT;

      INSERT INTO notebooks (id, name, is_system, created_at)
      VALUES
        ('notebook-tutorial', 'Tutorial', 1, ${Date.now()}),
        ('notebook-general',  'General',  0, ${Date.now()});

      INSERT INTO discussions (id, notebook_id, parent_id, name, created_at)
      VALUES
        ('discussion-default', 'notebook-general', NULL, 'Getting Started', ${Date.now()});
    `,
  },
  {
    version: 5,
    description: "Add system_prompt to notebooks, move Getting Started to Tutorial",
    sql: `
      ALTER TABLE notebooks ADD COLUMN system_prompt TEXT;

      UPDATE notebooks
      SET system_prompt = 'You are assisting a user of PACT — a Prompt and Context Tracking system built as a VSCode extension. PACT treats AI interactions not as conversations but as structured notebook executions. Each prompt becomes an immutable cell with a recorded response, forming a reasoning ledger. PACT supports multiple LLMs (GPT and Claude) running in parallel, with responses stored in SQLite and exportable to Obsidian. The user is exploring PACT architecture and capabilities through a structured tutorial.'
      WHERE id = 'notebook-tutorial';

      UPDATE discussions
      SET notebook_id = 'notebook-tutorial'
      WHERE id = 'discussion-default';

      UPDATE discussions
      SET name = 'Getting Started'
      WHERE id = 'discussion-default';
    `,
  },
  {
    version: 6,
    description: "Add parent_id to responses",
    sql: `
    ALTER TABLE responses ADD COLUMN parent_id TEXT;
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