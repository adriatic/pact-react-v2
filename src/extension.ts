import * as vscode from "vscode";
import * as path from "path";
import { eventBus } from "./execution/eventBus";
import { ExecutionEngine } from "./execution/ExecutionEngine";
import { LLMRouter } from "./llm/llmRouter";

export function activate(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "pact",
    "PACT",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, "out")),
      ],
    }
  );

  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.file(
      path.join(context.extensionPath, "out", "index.js")
    )
  );

  panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <body>
        <div id="root"></div>

        <script>
          (function () {
            const vscode = acquireVsCodeApi();
            window.vscode = vscode;
            window.acquireVsCodeApi = () => vscode;
          })();
        </script>

        <script src="${scriptUri}"></script>
      </body>
    </html>
  `;

  // Initialize router with API keys
  const router = new LLMRouter();

  async function initRouter() {
    const gptKey = await context.secrets.get("OPENAI_API_KEY");
    const claudeKey = await context.secrets.get("ANTHROPIC_API_KEY");
    router.setApiKey(gptKey);
    router.setClaudeKey(claudeKey);
  }

  initRouter();

  // Instantiate engine
  const engine = new ExecutionEngine(router);

  // Subscribe to event bus — forward all events to webview
  eventBus.subscribe((event) => {
    panel.webview.postMessage(event);
  });

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(async (message) => {
    console.log("EXT RECEIVED:", message);

    if (message.type === "RUN_REQUESTED") {
      await engine.runPrompt(message.prompt);
    }

    if (message.type === "RETRY_CELL") {
      await engine.retryCell(message.cellId);
    }
  });
}