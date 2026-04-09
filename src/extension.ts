import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const EXECUTION_DELAY_MS = 3000;

type Cell = {
  prompt: string;
  response?: string;
};

export function activate(context: vscode.ExtensionContext): void {
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

  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView: vscode.WebviewView): void {
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "dist"),
        ],
      };

      // 🔥 LOAD FILE-BASED NOTEBOOK
      let cells: Cell[] = [];

      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(raw);
          cells = parsed.cells || [];
        } catch {
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

            fs.writeFileSync(
              filePath,
              JSON.stringify({ cells }, null, 2)
            );
          }, EXECUTION_DELAY_MS);
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
  const htmlPath = vscode.Uri.joinPath(
    extensionUri,
    "dist",
    "index.html"
  );

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