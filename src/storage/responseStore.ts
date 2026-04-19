import { getDb } from "./db";

export class ResponseStore {
  private extensionPath: string;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
  }

  get(promptId: string): string | null {
    const db = getDb(this.extensionPath);

    const row = db
      .prepare("SELECT response FROM responses WHERE prompt_id = ?")
      .get(promptId) as { response: string } | undefined;

    return row ? row.response : null;
  }

  save(promptId: string, promptText: string, response: string): void {
    const db = getDb(this.extensionPath);

    db.prepare(`
      INSERT OR REPLACE INTO responses (prompt_id, prompt_text, response, created_at)
      VALUES (?, ?, ?, ?)
    `).run(promptId, promptText, response, Date.now());
  }
}