import * as vscode from "vscode";
import OpenAI from "openai";

type Cell = {
  id: string;
  parentId?: string;
  prompt: string;
  response: string;
  label?: string;
};

type ExecutionEvent =
  | { type: "cellStarted"; cellId: string; parentId?: string; label?: string }
  | { type: "cellStream"; cellId: string; chunk: string }
  | { type: "cellCompleted"; cellId: string }
  | { type: "cellError"; cellId: string; error: string };

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ExecutionEngine {
  private panel: vscode.WebviewPanel;
  private context: vscode.ExtensionContext;
  private cells: Record<string, Cell> = {};
  private lastCellId?: string;
  private isRunning = false;
  private openai?: OpenAI;

  constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;
  }

  private async getClient(): Promise<OpenAI> {
    if (this.openai) return this.openai;

    const apiKey = await this.context.secrets.get("openai_api_key");

    if (!apiKey) {
      vscode.window.showErrorMessage("OpenAI API key not set");
      throw new Error("Missing API key");
    }

    this.openai = new OpenAI({ apiKey });
    return this.openai;
  }

  async runPrompt(promptText: string, parentOverride?: string) {
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
      const parentId =
        parentOverride !== undefined
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

    } catch (err: any) {
      this.emit({
        type: "cellError",
        cellId: "",
        error: err?.message || "LLM error"
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async runSingleModel(
    cellId: string,
    promptText: string,
    model: string
  ) {
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

  async retryCell(cellId: string) {
    const original = this.cells[cellId];
    if (!original) return;

    return this.runPrompt(original.prompt, original.parentId);
  }

  private createCell(prompt: string, parentId?: string, label?: string): string {
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

  private emit(event: ExecutionEvent) {
    this.panel.webview.postMessage(event);
  }
}