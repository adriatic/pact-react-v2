import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext): void {
  console.log("=== ACTIVATE CALLED ===");

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView: vscode.WebviewView): void {
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