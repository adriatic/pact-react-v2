"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const notebookService_1 = require("./persistence/notebookService");
const cellService_1 = require("./persistence/cellService");
function activate(context) {
    console.log("🔥 PACT EXTENSION ACTIVATED");
    const openUI = () => {
        console.log("🚀 Opening PACT UI");
        const panel = vscode.window.createWebviewPanel("pact", "PACT", vscode.ViewColumn.One, {
            enableScripts: true,
        });
        panel.webview.html = getHtml(panel, context);
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("No workspace folder open");
            return;
        }
        const notebooks = (0, notebookService_1.listNotebooks)();
        const notebookId = notebooks.length > 0 ? notebooks[0] : (0, notebookService_1.createUserNotebook)();
        const notebookPath = (0, notebookService_1.getNotebookPath)(notebookId);
        console.log("📁 Notebook path:", notebookPath);
        panel.webview.onDidReceiveMessage((message) => {
            if (message.type === "RUN_PROMPT") {
                const promptText = message.payload.text;
                const { cellPath } = (0, cellService_1.createNextCell)(notebookPath);
                (0, cellService_1.writePrompt)(cellPath, promptText);
                const response = `Mock response to: ${promptText}`;
                (0, cellService_1.writeResponse)(cellPath, response);
                const cells = (0, cellService_1.readAllCells)(notebookPath);
                panel.webview.postMessage({
                    type: "SYNC_STATE",
                    payload: { cells },
                });
            }
        });
        const cells = (0, cellService_1.readAllCells)(notebookPath);
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
function getHtml(panel, context) {
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
        if (src.startsWith("http"))
            return match;
        const resourcePath = vscode.Uri.file(path.join(distPath, src));
        const webviewUri = panel.webview.asWebviewUri(resourcePath);
        return `${attr}="${webviewUri}"`;
    });
    return html;
}
function deactivate() { }
