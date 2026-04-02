import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function getPactRoot(): string {
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

export function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
}

export function isSystemNotebook(notebookId: string): boolean {
  return [
    "core-prompts",
    "core-responses",
    "integrated-prompts",
    "integrated-responses"
  ].includes(notebookId);
}