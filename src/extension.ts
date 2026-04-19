import * as vscode from "vscode";
import * as path from "path";
import { eventBus } from "./execution/eventBus";
import { ExecutionEngine } from "./execution/ExecutionEngine";
import { LLMRouter } from "./llm/llmRouter";
import { corePrompts } from "./prompts/core";

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

  const router = new LLMRouter();

  async function initRouter() {
    const gptKey = await context.secrets.get("OPENAI_API_KEY");
    const claudeKey = await context.secrets.get("ANTHROPIC_API_KEY");
    router.setApiKey(gptKey);
    router.setClaudeKey(claudeKey);
  }

  initRouter();

  const engine = new ExecutionEngine(router, context.extensionPath);

  eventBus.subscribe((event) => {
    panel.webview.postMessage(event);
  });

  function resolvePrompt(raw: string): {
    text: string;
    label?: string;
    cellType: "tutorial" | "user";
    promptId?: string;
  } {
    const match = raw.match(/^\/prompt\s+(\d+)/i);

    if (match) {
      const id = match[1].padStart(2, "0");
      const found = corePrompts.find(p => p.id === id);

      if (found) {
        return {
          text: found.text,
          label: `${found.id} · ${found.title}`,
          cellType: "tutorial",
          promptId: found.id,
        };
      }
    }

    return { text: raw, cellType: "user" };
  }

  panel.webview.onDidReceiveMessage(async (message) => {
    console.log("EXT RECEIVED:", message);

    try {
      if (message.type === "RUN_REQUESTED") {
        const { text, label, cellType, promptId } = resolvePrompt(message.prompt);
        await engine.runPrompt(text, undefined, label, cellType, promptId);
      }

      if (message.type === "RETRY_CELL") {
        await engine.retryCell(message.cellId);
      }
    } catch (err: any) {
      console.error("PACT ENGINE ERROR:", err?.message, err?.stack);
    }
  });
 
}