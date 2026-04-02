"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const notebookService_1 = require("./persistence/notebookService");
const cellService_1 = require("./persistence/cellService");
function activate(context) {
    console.log("🔥 PACT EXTENSION ACTIVATED");
    // Register command to open UI
    const command = vscode.commands.registerCommand("pact.openUI", () => {
        const panel = vscode.window.createWebviewPanel("pact", "PACT", vscode.ViewColumn.One, {
            enableScripts: true,
        });
        panel.webview.html = getHtml();
        // Ensure notebook exists
        const notebooks = (0, notebookService_1.listNotebooks)();
        const notebookId = notebooks.length > 0 ? notebooks[0] : (0, notebookService_1.createUserNotebook)();
        const notebookPath = (0, notebookService_1.getNotebookPath)(notebookId);
        // 🔥 Handle messages from React
        panel.webview.onDidReceiveMessage((message) => {
            console.log("📥 Message from UI:", message);
            if (message.type === "RUN_PROMPT") {
                const promptText = message.payload.text;
                const { cellPath } = (0, cellService_1.createNextCell)(notebookPath);
                (0, cellService_1.writePrompt)(cellPath, promptText);
                const response = `Mock response to: ${promptText}`;
                (0, cellService_1.writeResponse)(cellPath, response);
                const cells = (0, cellService_1.readAllCells)(notebookPath);
                console.log("📤 Sending SYNC_STATE:", cells);
                panel.webview.postMessage({
                    type: "SYNC_STATE",
                    payload: { cells },
                });
            }
        });
        // 🔥 Initial sync (load existing history)
        const cells = (0, cellService_1.readAllCells)(notebookPath);
        panel.webview.postMessage({
            type: "SYNC_STATE",
            payload: { cells },
        });
    });
    context.subscriptions.push(command);
}
function getHtml() {
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
function deactivate() { }
