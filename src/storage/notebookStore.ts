import { getDb } from "./db";

export type Notebook = {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: number;
};

export type Discussion = {
  id: string;
  notebookId: string;
  parentId?: string;
  name: string;
  createdAt: number;
  totalTimeMs: number;
};

export class NotebookStore {
  private extensionPath: string;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
  }

  // ── Notebooks ─────────────────────────────────────────────────────────────

  getAllNotebooks(): Notebook[] {
    const db = getDb(this.extensionPath);

    const rows = db
      .prepare("SELECT * FROM notebooks ORDER BY is_system DESC, name ASC")
      .all() as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      isSystem: r.is_system === 1,
      createdAt: r.created_at,
    }));
  }

  createNotebook(name: string): Notebook {
    const db = getDb(this.extensionPath);
    const id = `notebook-${Date.now()}`;
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO notebooks (id, name, is_system, created_at)
      VALUES (?, ?, 0, ?)
    `).run(id, name, createdAt);

    return { id, name, isSystem: false, createdAt };
  }

  // ── Discussions ───────────────────────────────────────────────────────────

  getDiscussionsForNotebook(notebookId: string): Discussion[] {
    const db = getDb(this.extensionPath);

    const rows = db
      .prepare(`
        SELECT * FROM discussions
        WHERE notebook_id = ?
        ORDER BY created_at ASC
      `)
      .all(notebookId) as any[];

    return rows.map(r => ({
      id: r.id,
      notebookId: r.notebook_id,
      parentId: r.parent_id ?? undefined,
      name: r.name,
      createdAt: r.created_at,
      totalTimeMs: r.total_time_ms,
    }));
  }

  getCellsForDiscussion(discussionId: string): any[] {
    const db = getDb(this.extensionPath);
    const rows = db
      .prepare(`
      SELECT * FROM responses
      WHERE discussion_id = ?
      ORDER BY created_at ASC
    `)
      .all(discussionId) as any[];

    return rows.map(r => ({
      id: r.prompt_id,
      parentId: r.parent_id ?? undefined,
      response: r.response,
      status: "done",
      elapsedMs: 0,
      label: r.cell_type === "tutorial" ? r.prompt_id : undefined,
    }));
  }

  createDiscussion(
    notebookId: string,
    name: string,
    parentId?: string,
  ): Discussion {
    const db = getDb(this.extensionPath);
    const id = `discussion-${Date.now()}`;
    const createdAt = Date.now();

    db.prepare(`
      INSERT INTO discussions (id, notebook_id, parent_id, name, created_at, total_time_ms)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(id, notebookId, parentId ?? null, name, createdAt);

    return { id, notebookId, parentId, name, createdAt, totalTimeMs: 0 };
  }

  deleteDiscussion(discussionId: string): void {
    const db = getDb(this.extensionPath);
    db.prepare("DELETE FROM responses WHERE discussion_id = ?").run(discussionId);
    db.prepare("DELETE FROM discussions WHERE id = ?").run(discussionId);
  }

  deleteNotebook(notebookId: string): void {
    const db = getDb(this.extensionPath);
    // Delete all cells from all discussions in this notebook
    db.prepare(`
    DELETE FROM responses WHERE discussion_id IN (
      SELECT id FROM discussions WHERE notebook_id = ?
    )
  `).run(notebookId);
    db.prepare("DELETE FROM discussions WHERE notebook_id = ?").run(notebookId);
    db.prepare("DELETE FROM notebooks WHERE id = ?").run(notebookId);
  }

  addTime(discussionId: string, elapsedMs: number): void {
    const db = getDb(this.extensionPath);

    db.prepare(`
      UPDATE discussions
      SET total_time_ms = total_time_ms + ?
      WHERE id = ?
    `).run(elapsedMs, discussionId);
  }

  getDefaultDiscussionId(): string {
    return "discussion-default";
  }

  getSystemPrompt(notebookId: string): string | null {
    const db = getDb(this.extensionPath);

    const row = db
      .prepare("SELECT system_prompt FROM notebooks WHERE id = ?")
      .get(notebookId) as { system_prompt: string | null } | undefined;

    return row?.system_prompt ?? null;
  }
}