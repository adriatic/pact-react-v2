"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseStore = void 0;
const db_1 = require("./db");
class ResponseStore {
    constructor(extensionPath) {
        this.extensionPath = extensionPath;
    }
    get(promptId) {
        const db = (0, db_1.getDb)(this.extensionPath);
        const row = db
            .prepare("SELECT response FROM responses WHERE prompt_id = ?")
            .get(promptId);
        return row ? row.response : null;
    }
    save(promptId, promptText, response) {
        const db = (0, db_1.getDb)(this.extensionPath);
        db.prepare(`
      INSERT OR REPLACE INTO responses (prompt_id, prompt_text, response, created_at)
      VALUES (?, ?, ?, ?)
    `).run(promptId, promptText, response, Date.now());
    }
}
exports.ResponseStore = ResponseStore;
