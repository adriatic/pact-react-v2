import * as vscode from "vscode";
import * as path from "path";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export function activate(context: vscode.ExtensionContext) {

  // ✅ Register command to set Claude key
  context.subscriptions.push(
    vscode.commands.registerCommand("pact.setClaudeKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter Claude (Anthropic) API Key",
        ignoreFocusOut: true,
        password: true,
      });

      if (key) {
        await context.secrets.store("ANTHROPIC_API_KEY", key);
        vscode.window.showInformationMessage("Claude API key saved");
      }
    })
  );

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

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === "runPrompt") {
      let prompt = message.promptText;

      let useClaude = false;

      if (prompt.startsWith("/claude")) {
        useClaude = true;
        prompt = prompt.replace("/claude", "").trim();
      }

      try {
        if (useClaude) {
          const apiKey = await context.secrets.get("ANTHROPIC_API_KEY");

          if (!apiKey) {
            panel.webview.postMessage({
              type: "response",
              text: "ERROR: Claude API key not set",
            });
            return;
          }

          const anthropic = new Anthropic({ apiKey });

          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
          });

          const text =
            response.content?.[0]?.type === "text"
              ? response.content[0].text
              : "No Claude response";

          panel.webview.postMessage({
            type: "response",
            text,
          });
        } else {
          const apiKey = await context.secrets.get("OPENAI_API_KEY");

          if (!apiKey) {
            panel.webview.postMessage({
              type: "response",
              text: "ERROR: OpenAI API key not set",
            });
            return;
          }

          const openai = new OpenAI({ apiKey });

          const response = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: prompt,
          });

          const text =
            response.output_text ||
            "No response text returned";

          panel.webview.postMessage({
            type: "response",
            text,
          });
        }
      } catch (err: any) {
        panel.webview.postMessage({
          type: "response",
          text: "ERROR: " + err.message,
        });
      }
    }
  });
}