"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
function activate(context) {
    console.log("=== ACTIVATE CALLED ===");
    const provider = {
        resolveWebviewView(webviewView) {
            console.log("=== VIEW RESOLVED ===");
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, "dist"),
                ],
            };
            // 🔥 MESSAGE HANDLER
            webviewView.webview.onDidReceiveMessage((message) => {
                if (message.type === "runPrompt") {
                    console.log("RUN:", message.payload);
                    // send back to UI
                    webviewView.webview.postMessage({
                        type: "addCell",
                        payload: message.payload,
                    });
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
