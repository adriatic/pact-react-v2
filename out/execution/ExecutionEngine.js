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
exports.ExecutionEngine = void 0;
const vscode = __importStar(require("vscode"));
const openai_1 = __importDefault(require("openai"));
function generateId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
class ExecutionEngine {
    constructor(panel, context) {
        this.cells = {};
        this.isRunning = false;
        this.panel = panel;
        this.context = context;
    }
    async getClient() {
        if (this.openai)
            return this.openai;
        const apiKey = await this.context.secrets.get("openai_api_key");
        if (!apiKey) {
            vscode.window.showErrorMessage("OpenAI API key not set");
            throw new Error("Missing API key");
        }
        this.openai = new openai_1.default({ apiKey });
        return this.openai;
    }
    async runPrompt(promptText, parentOverride) {
        if (this.isRunning) {
            this.emit({
                type: "cellError",
                cellId: "",
                error: "Execution already in progress"
            });
            return;
        }
        this.isRunning = true;
        try {
            const parentId = parentOverride !== undefined
                ? parentOverride
                : this.lastCellId;
            const rootId = this.createCell(promptText, parentId);
            this.emit({
                type: "cellStarted",
                cellId: rootId,
                parentId
            });
            // 🔥 DIFFERENT MODELS (still OpenAI)
            const child1 = this.createCell(promptText, rootId, "Model A");
            const child2 = this.createCell(promptText, rootId, "Model B");
            this.emit({ type: "cellStarted", cellId: child1, parentId: rootId, label: "Model A" });
            this.emit({ type: "cellStarted", cellId: child2, parentId: rootId, label: "Model B" });
            await Promise.all([
                this.runSingleModel(child1, promptText, "gpt-4.1-mini"),
                this.runSingleModel(child2, promptText, "gpt-4.1") // 🔥 change here
            ]);
            this.emit({ type: "cellCompleted", cellId: child1 });
            this.emit({ type: "cellCompleted", cellId: child2 });
            this.emit({ type: "cellCompleted", cellId: rootId });
        }
        catch (err) {
            this.emit({
                type: "cellError",
                cellId: "",
                error: err?.message || "LLM error"
            });
        }
        finally {
            this.isRunning = false;
        }
    }
    async runSingleModel(cellId, promptText, model) {
        const client = await this.getClient();
        const stream = await client.responses.stream({
            model,
            input: promptText
        });
        for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
                const chunk = event.delta;
                this.cells[cellId].response += chunk;
                this.emit({
                    type: "cellStream",
                    cellId,
                    chunk
                });
            }
        }
    }
    async retryCell(cellId) {
        const original = this.cells[cellId];
        if (!original)
            return;
        return this.runPrompt(original.prompt, original.parentId);
    }
    createCell(prompt, parentId, label) {
        const id = generateId();
        this.cells[id] = {
            id,
            parentId,
            prompt,
            response: "",
            label
        };
        this.lastCellId = id;
        return id;
    }
    emit(event) {
        this.panel.webview.postMessage(event);
    }
}
exports.ExecutionEngine = ExecutionEngine;
