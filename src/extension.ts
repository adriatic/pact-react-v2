import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext): void {
  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView: vscode.WebviewView): void {
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

      webviewView.webview.html = getHtml(
        webviewView.webview,
        context.extensionUri
      );
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "pact.controlPanel",
      provider
    )
  );
}

function getHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const htmlPath = vscode.Uri.joinPath(extensionUri, "dist", "index.html");

  let html: string = fs.readFileSync(htmlPath.fsPath, "utf8");

  html = html.replace(
    /(src|href)="([^"]+)"/g,
    (_match: string, attr: string, src: string): string => {
      const resource = vscode.Uri.joinPath(
        extensionUri,
        "dist",
        src
      );
      const webviewUri = webview.asWebviewUri(resource);
      return `${attr}="${webviewUri}"`;
    }
  );

  return html;
}

export function deactivate(): void {}