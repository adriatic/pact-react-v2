"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotebooks = listNotebooks;
exports.createUserNotebook = createUserNotebook;
exports.getNotebookPath = getNotebookPath;
exports.assertWritable = assertWritable;
const fs = require("fs");
const path = require("path");
const storage_1 = require("./storage");
function listNotebooks() {
    const root = (0, storage_1.getPactRoot)();
    return fs.readdirSync(root).filter(name => {
        const fullPath = path.join(root, name);
        return fs.statSync(fullPath).isDirectory();
    });
}
function createUserNotebook() {
    const root = (0, storage_1.getPactRoot)();
    const existing = listNotebooks()
        .filter(n => n.startsWith("notebook-"));
    const nextIndex = existing.length + 1;
    const notebookId = `notebook-${nextIndex}`;
    const notebookPath = path.join(root, notebookId);
    (0, storage_1.ensureDir)(notebookPath);
    return notebookId;
}
function getNotebookPath(notebookId) {
    return path.join((0, storage_1.getPactRoot)(), notebookId);
}
function assertWritable(notebookId) {
    if ((0, storage_1.isSystemNotebook)(notebookId)) {
        throw new Error(`Notebook ${notebookId} is read-only`);
    }
}
