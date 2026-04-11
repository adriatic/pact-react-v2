import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

console.log("Node version:", process.version);

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("pact.open", () => {
    const panel = vscode.window.createWebviewPanel(
      "pact",
      "PACT",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "dist")),
        ],
      },
    );

    const distPath = path.join(context.extensionPath, "dist");
    const indexHtmlPath = vscode.Uri.file(path.join(distPath, "index.html"));

    panel.webview.html = getHtml(panel.webview, indexHtmlPath);

    let isRunning = false;
    let cancelRequested = false;

    // 🧠 Store cell results for context lookup
    const cellResults = new Map<string, string>();

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "runPrompt" || message.type === "retryCell") {
        if (isRunning) {
          panel.webview.postMessage({ type: "busy" });
          return;
        }

        const prompt = message.prompt;
        const parentId = message.parentId || null;

        isRunning = true;
        cancelRequested = false;

        const cellId = generateId();

        panel.webview.postMessage({
          type: "startCell",
          id: cellId,
          parentId,
          prompt,
        });

        panel.webview.postMessage({ type: "running" });

        try {
          // 🧠 Build context
          let base = `Echo: ${prompt}`;

          if (parentId && cellResults.has(parentId)) {
            const parentResponse = cellResults.get(parentId);
            base = `Echo: ${parentResponse} → ${prompt}`;
          }

          const words = base.split(" ");
          let current = "";

          for (const word of words) {
            if (cancelRequested) break;

            await delay(500);

            if (cancelRequested) break;

            current += (current ? " " : "") + word;

            panel.webview.postMessage({
              type: "stream",
              id: cellId,
              chunk: current,
            });
          }

          // 🧠 Store final response
          cellResults.set(cellId, current);

          panel.webview.postMessage({
            type: "completeCell",
            id: cellId,
            status: cancelRequested ? "stopped" : "completed",
          });
        } finally {
          isRunning = false;
          cancelRequested = false;
          panel.webview.postMessage({ type: "idle" });
        }
      }

      if (message.type === "cancel") {
        cancelRequested = true;
      }
    });
  });

  context.subscriptions.push(disposable);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHtml(webview: vscode.Webview, htmlUri: vscode.Uri): string {
  let html = fs.readFileSync(htmlUri.fsPath, "utf8");

  html = html.replace(
    /(<script.*?src="|<link.*?href=")(.*?)"/g,
    (match: string, p1: string, p2: string) => {
      const resourcePath = vscode.Uri.file(
        path.join(path.dirname(htmlUri.fsPath), p2),
      );
      const webviewUri = webview.asWebviewUri(resourcePath);
      return `${p1}${webviewUri.toString()}"`;
    },
  );

  return html;
}

export function deactivate() {}
