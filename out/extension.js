"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
function activate(context) {
    // ✅ Register command to set Claude key
    context.subscriptions.push(vscode.commands.registerCommand("pact.setClaudeKey", async () => {
        const key = await vscode.window.showInputBox({
            prompt: "Enter Claude (Anthropic) API Key",
            ignoreFocusOut: true,
            password: true,
        });
        if (key) {
            await context.secrets.store("ANTHROPIC_API_KEY", key);
            vscode.window.showInformationMessage("Claude API key saved");
        }
    }));
    const panel = vscode.window.createWebviewPanel("pact", "PACT", vscode.ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "out")),
        ],
    });
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "out", "index.js")));
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
                    const anthropic = new sdk_1.default({ apiKey });
                    const response = await anthropic.messages.create({
                        model: "claude-sonnet-4-6",
                        max_tokens: 500,
                        messages: [{ role: "user", content: prompt }],
                    });
                    const text = response.content?.[0]?.type === "text"
                        ? response.content[0].text
                        : "No Claude response";
                    panel.webview.postMessage({
                        type: "response",
                        text,
                    });
                }
                else {
                    const apiKey = await context.secrets.get("OPENAI_API_KEY");
                    if (!apiKey) {
                        panel.webview.postMessage({
                            type: "response",
                            text: "ERROR: OpenAI API key not set",
                        });
                        return;
                    }
                    const openai = new openai_1.default({ apiKey });
                    const response = await openai.responses.create({
                        model: "gpt-4.1-mini",
                        input: prompt,
                    });
                    const text = response.output_text ||
                        "No response text returned";
                    panel.webview.postMessage({
                        type: "response",
                        text,
                    });
                }
            }
            catch (err) {
                panel.webview.postMessage({
                    type: "response",
                    text: "ERROR: " + err.message,
                });
            }
        }
    });
}
