"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
function activate(context) {
    const provider = {
        resolveWebviewView(webviewView) {
            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, "dist"),
                ],
            };
            webviewView.webview.onDidReceiveMessage((message) => {
                console.log("EXT RECEIVED:", message); // 🔍 DEBUG
                if (message.type === "runPrompt") {
                    webviewView.webview.postMessage({
                        type: "addCell",
                        payload: message.payload,
                    });
                    setTimeout(() => {
                        console.log("EXT SENDING RESPONSE"); // 🔍 DEBUG
                        webviewView.webview.postMessage({
                            type: "addResponse",
                            payload: `Response to: ${message.payload}`,
                        });
                    }, 500);
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
