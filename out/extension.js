"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const EXECUTION_DELAY_MS = 3000;
function activate(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const pactDir = path.join(workspacePath, "pact");
    const filePath = path.join(pactDir, "notebook.json");
    // Ensure directory exists
    if (!fs.existsSync(pactDir)) {
        fs.mkdirSync(pactDir, { recursive: true });
    }
    const provider = {
        resolveWebviewView(webviewView) {
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, "dist"),
                ],
            };
            // 🔥 LOAD FILE-BASED NOTEBOOK
            let cells = [];
            if (fs.existsSync(filePath)) {
                try {
                    const raw = fs.readFileSync(filePath, "utf8");
                    const parsed = JSON.parse(raw);
                    cells = parsed.cells || [];
                }
                catch {
                    cells = [];
                }
            }
            // Send to UI
            setTimeout(() => {
                webviewView.webview.postMessage({
                    type: "loadCells",
                    payload: cells,
                });
            }, 100);
            webviewView.webview.onDidReceiveMessage((message) => {
                if (message.type === "runPrompt") {
                    const prompt = message.payload;
                    webviewView.webview.postMessage({
                        type: "addCell",
                        payload: prompt,
                    });
                    setTimeout(() => {
                        const response = `Response to: ${prompt}`;
                        webviewView.webview.postMessage({
                            type: "addResponse",
                            payload: response,
                        });
                        // 🔥 WRITE TO FILE
                        cells.push({ prompt, response });
                        fs.writeFileSync(filePath, JSON.stringify({ cells }, null, 2));
                    }, EXECUTION_DELAY_MS);
                }
            });
            webviewView.webview.html = getHtml(webviewView.webview, context.extensionUri);
        },
    };
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("pact.controlPanel", provider));
}
function getHtml(webview, extensionUri) {
    const htmlPath = vscode.Uri.joinPath(extensionUri, "dist", "index.html");
    let html = fs.readFileSync(htmlPath.fsPath, "utf8");
    html = html.replace(/(src|href)="([^"]+)"/g, (_match, attr, src) => {
        const resource = vscode.Uri.joinPath(extensionUri, "dist", src);
        const webviewUri = webview.asWebviewUri(resource);
        return `${attr}="${webviewUri}"`;
    });
    return html;
}
function deactivate() { }
