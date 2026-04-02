"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPactRoot = getPactRoot;
exports.ensureDir = ensureDir;
exports.isSystemNotebook = isSystemNotebook;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function getPactRoot() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error("No workspace folder open");
    }
    const pactRoot = path.join(workspaceFolder.uri.fsPath, "pact-data");
    if (!fs.existsSync(pactRoot)) {
        fs.mkdirSync(pactRoot);
    }
    return pactRoot;
}
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
}
function isSystemNotebook(notebookId) {
    return [
        "core-prompts",
        "core-responses",
        "integrated-prompts",
        "integrated-responses"
    ].includes(notebookId);
}
