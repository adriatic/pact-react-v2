import * as vscode from "vscode";
import * as path from "path";
import { eventBus } from "./execution/eventBus";
import { ExecutionEngine } from "./execution/ExecutionEngine";
import { LLMRouter } from "./llm/llmRouter";
import { corePrompts } from "./prompts/core";
import { NotebookStore } from "./storage/notebookStore";

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
  const notebookStore = new NotebookStore(context.extensionPath);

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

    try {
      // ── Execution ────────────────────────────────────────────────────────

      if (message.type === "RUN_REQUESTED") {
        const blocks = message.blocks;
        const model = message.model ?? "gpt";
        const discussionId = message.discussionId ?? "discussion-default";

        const firstText = blocks?.find((b: any) => b.type === "text")?.text?.trim() ?? "";
        const { text, label, cellType, promptId } = resolvePrompt(firstText);

        const image = blocks?.find((b: any) => b.type === "image");

        if (cellType === "tutorial") {
          await engine.runPrompt(
            text, undefined, label, cellType, promptId,
            undefined, "gpt", discussionId,
          );
        } else {
          await engine.runPrompt(
            text, undefined, label, cellType, promptId,
            image ? { base64: image.base64, mimeType: image.mimeType } : undefined,
            model, discussionId,
          );
        }
      }

      if (message.type === "RETRY_CELL") {
        console.log("EXT RETRY_CELL:", message.cellId, "model:", message.model);
        await engine.retryCell(message.cellId, message.model);
      }

      // ── Explorer ─────────────────────────────────────────────────────────

      if (message.type === "EXPLORER_LOAD") {
        const notebooks = notebookStore.getAllNotebooks();
        const allDiscussions = notebooks.flatMap(nb =>
          notebookStore.getDiscussionsForNotebook(nb.id)
        );

        panel.webview.postMessage({
          type: "notebooksLoaded",
          notebooks,
          discussions: allDiscussions,
        });
      }

      if (message.type === "CREATE_NOTEBOOK") {
        const notebook = notebookStore.createNotebook(message.name);
        panel.webview.postMessage({ type: "notebookCreated", notebook });
      }

      if (message.type === "CREATE_DISCUSSION") {
        const discussion = notebookStore.createDiscussion(
          message.notebookId,
          message.name,
        );
        panel.webview.postMessage({ type: "discussionCreated", discussion });
      }

      if (message.type === "LOAD_DISCUSSION_CELLS") {
        const cells = notebookStore.getCellsForDiscussion(message.discussionId);
        panel.webview.postMessage({ type: "discussionCellsLoaded", cells });
      }

      if (message.type === "DELETE_DISCUSSION") {
        notebookStore.deleteDiscussion(message.discussionId);
        panel.webview.postMessage({ type: "discussionDeleted", discussionId: message.discussionId });
      }

      if (message.type === "DELETE_NOTEBOOK") {
        notebookStore.deleteNotebook(message.notebookId);
        panel.webview.postMessage({ type: "notebookDeleted", notebookId: message.notebookId });
      }

    } catch (err: any) {
      console.error("PACT ENGINE ERROR:", err?.message, err?.stack);
    }
  });
}