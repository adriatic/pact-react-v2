import * as vscode from "vscode";
import * as path from "path";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

type CellState = {
  prompt: string;
  parentId?: string;
};

export function activate(context: vscode.ExtensionContext) {
  const cellStore: Record<string, CellState> = {};

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

  async function executePrompt(prompt: string, parentId?: string) {
    let useClaude = false;

    if (prompt.startsWith("/claude")) {
      useClaude = true;
      prompt = prompt.replace("/claude", "").trim();
    }

    const cellId = Date.now().toString();

    cellStore[cellId] = { prompt, parentId };

    panel.webview.postMessage({
      type: "cellStarted",
      cellId,
      parentId,
      label: useClaude ? "Claude" : "GPT"
    });

    try {
      let text = "";

      if (useClaude) {
        const apiKey = await context.secrets.get("ANTHROPIC_API_KEY");
        if (!apiKey) throw new Error("Claude API key not set");

        const anthropic = new Anthropic({ apiKey });

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });

        text =
          response.content?.[0]?.type === "text"
            ? response.content[0].text
            : "No Claude response";
      } else {
        const apiKey = await context.secrets.get("OPENAI_API_KEY");
        if (!apiKey) throw new Error("OpenAI API key not set");

        const openai = new OpenAI({ apiKey });

        const response = await openai.responses.create({
          model: "gpt-4.1-mini",
          input: prompt,
        });

        text =
          response.output_text ||
          "No response text returned";
      }

      panel.webview.postMessage({
        type: "cellStream",
        cellId,
        chunk: text
      });

      panel.webview.postMessage({
        type: "cellCompleted",
        cellId
      });

    } catch (err: any) {
      panel.webview.postMessage({
        type: "cellStream",
        cellId,
        chunk: "ERROR: " + err.message
      });

      panel.webview.postMessage({
        type: "cellCompleted",
        cellId
      });
    }
  }

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === "runPrompt") {
      await executePrompt(message.promptText);
    }

    if (message.type === "retryCell") {
      const original = cellStore[message.cellId];
      if (!original) return;

      await executePrompt(original.prompt, message.cellId);
    }
  });
}