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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const eventBus_1 = require("./execution/eventBus");
const ExecutionEngine_1 = require("./execution/ExecutionEngine");
const llmRouter_1 = require("./llm/llmRouter");
const core_1 = require("./prompts/core");
function activate(context) {
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
    const router = new llmRouter_1.LLMRouter();
    async function initRouter() {
        const gptKey = await context.secrets.get("OPENAI_API_KEY");
        const claudeKey = await context.secrets.get("ANTHROPIC_API_KEY");
        router.setApiKey(gptKey);
        router.setClaudeKey(claudeKey);
    }
    initRouter();
    const engine = new ExecutionEngine_1.ExecutionEngine(router, context.extensionPath);
    eventBus_1.eventBus.subscribe((event) => {
        panel.webview.postMessage(event);
    });
    function resolvePrompt(raw) {
        const match = raw.match(/^\/prompt\s+(\d+)/i);
        if (match) {
            const id = match[1].padStart(2, "0");
            const found = core_1.corePrompts.find(p => p.id === id);
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
        }
        catch (err) {
            console.error("PACT ENGINE ERROR:", err?.message, err?.stack);
        }
    });
}
