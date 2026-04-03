import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import {
  createUserNotebook,
  getNotebookPath,
  listNotebooks,
} from "./persistence/notebookService";

import {
  createNextCell,
  writePrompt,
  writeResponse,
  readAllCells,
} from "./persistence/cellService";

export function activate(context: vscode.ExtensionContext) {
  console.log("🔥 PACT EXTENSION ACTIVATED");

  const openUI = () => {
    console.log("🚀 Opening PACT UI");

    const panel = vscode.window.createWebviewPanel(
      "pact",
      "PACT",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    panel.webview.html = getHtml(panel, context);

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const notebooks = listNotebooks();
    const notebookId =
      notebooks.length > 0 ? notebooks[0] : createUserNotebook();

    const notebookPath = getNotebookPath(notebookId);

    console.log("📁 Notebook path:", notebookPath);

    panel.webview.onDidReceiveMessage((message) => {
      if (message.type === "RUN_PROMPT") {
        const promptText: string = message.payload.text;

        const { cellPath } = createNextCell(notebookPath);

        writePrompt(cellPath, promptText);

        const response = `Mock response to: ${promptText}`;

        writeResponse(cellPath, response);

        const cells = readAllCells(notebookPath);

        panel.webview.postMessage({
          type: "SYNC_STATE",
          payload: { cells },
        });
      }
    });

    const cells = readAllCells(notebookPath);

    panel.webview.postMessage({
      type: "SYNC_STATE",
      payload: { cells },
    });
  };

  // Command still exists (for debugging / fallback)
  const command = vscode.commands.registerCommand("pact.openUI", openUI);
  context.subscriptions.push(command);

  // 🔥 AUTO-OPEN (Phase A goal)
  openUI();
}

function getHtml(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
): string {
  const distPath = path.join(context.extensionPath, "dist");
  const htmlPath = path.join(distPath, "index.html");

  if (!fs.existsSync(htmlPath)) {
    return `
      <html>
        <body>
          <h2>PACT UI not built</h2>
          <p>Run <code>npm run build</code></p>
        </body>
      </html>
    `;
  }

  let html = fs.readFileSync(htmlPath, "utf-8");

  html = html.replace(/(src|href)="(.+?)"/g, (match, attr, src) => {
    if (src.startsWith("http")) return match;

    const resourcePath = vscode.Uri.file(path.join(distPath, src));
    const webviewUri = panel.webview.asWebviewUri(resourcePath);

    return `${attr}="${webviewUri}"`;
  });

  return html;
}

export function deactivate() {}