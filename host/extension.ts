import * as vscode from "vscode";

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
  // Register command to open UI
  const command = vscode.commands.registerCommand("pact.openUI", () => {
    const panel = vscode.window.createWebviewPanel(
      "pact",
      "PACT",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      },
    );

    panel.webview.html = getHtml();

    // Ensure notebook exists
    const notebooks = listNotebooks();
    const notebookId =
      notebooks.length > 0 ? notebooks[0] : createUserNotebook();

    const notebookPath = getNotebookPath(notebookId);

    // 🔥 Handle messages from React
    panel.webview.onDidReceiveMessage((message) => {
      console.log("📥 Message from UI:", message);

      if (message.type === "RUN_PROMPT") {
        const promptText: string = message.payload.text;

        const { cellPath } = createNextCell(notebookPath);

        writePrompt(cellPath, promptText);

        const response = `Mock response to: ${promptText}`;

        writeResponse(cellPath, response);

        const cells = readAllCells(notebookPath);

        console.log("📤 Sending SYNC_STATE:", cells);

        panel.webview.postMessage({
          type: "SYNC_STATE",
          payload: { cells },
        });
      }
    });

    // 🔥 Initial sync (load existing history)
    const cells = readAllCells(notebookPath);

    panel.webview.postMessage({
      type: "SYNC_STATE",
      payload: { cells },
    });
  });

  context.subscriptions.push(command);
}

function getHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <div id="root"></div>
        <script src="http://localhost:5173"></script>
      </body>
    </html>
  `;
}

export function deactivate() {}
