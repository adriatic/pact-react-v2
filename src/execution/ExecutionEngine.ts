import { eventBus, CellType } from "./eventBus";
import { LLMRouter, LLMModel } from "../llm/llmRouter";
import { ResponseStore } from "../storage/responseStore";

export type ImageAttachment = {
  base64: string;
  mimeType: string;
};

type Cell = {
  id: string;
  parentId?: string;
  prompt: string;
  label?: string;
  cellType: CellType;
  promptId?: string;
  image?: ImageAttachment;
  model: LLMModel;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ExecutionEngine {
  private cells: Record<string, Cell> = {};
  private isRunning = false;
  private router: LLMRouter;
  private store: ResponseStore;

  constructor(router: LLMRouter, extensionPath: string) {
    this.router = router;
    this.store = new ResponseStore(extensionPath);
  }

  async runPrompt(
    prompt: string,
    parentId?: string,
    label?: string,
    cellType: CellType = "user",
    promptId?: string,
    image?: ImageAttachment,
    model: LLMModel = "gpt",
  ) {
    if (this.isRunning) {
      eventBus.emit({
        type: "cellError",
        cellId: "",
        error: "Execution already in progress",
      });
      return;
    }

    this.isRunning = true;

    const cellId = generateId();
    const cellLabel = label ?? (model === "claude" ? "Claude" : "GPT");

    this.cells[cellId] = {
      id: cellId,
      parentId,
      prompt,
      label: cellLabel,
      cellType,
      promptId,
      image,
      model,
    };

    try {
      eventBus.emit({
        type: "cellStarted",
        cellId,
        parentId,
        label: cellLabel,
        cellType,
      });

      if (cellType === "tutorial" && promptId) {
        const stored = this.store.get(promptId);

        if (stored) {
          for (const char of stored.response) {
            eventBus.emit({ type: "cellStream", cellId, chunk: char });
          }
        } else {
          let full = "";

          await this.router.run(model, prompt, (token) => {
            full += token;
            eventBus.emit({ type: "cellStream", cellId, chunk: token });
          }, image);

          this.store.save(promptId, prompt, full, model, cellType);
        }
      } else {
        let full = "";

        await this.router.run(model, prompt, (token) => {
          full += token;
          eventBus.emit({ type: "cellStream", cellId, chunk: token });
        }, image);

        this.store.save(
          cellId, prompt, full, model, cellType,
          image?.base64, image?.mimeType,
        );
      }

      eventBus.emit({ type: "cellCompleted", cellId });

    } catch (err: any) {
      eventBus.emit({
        type: "cellError",
        cellId,
        error: err?.message || "LLM error",
      });
    } finally {
      this.isRunning = false;
    }
  }

  async retryCell(cellId: string) {
    const original = this.cells[cellId];
    if (!original) return;

    return this.runPrompt(
      original.prompt,
      original.parentId,
      original.label,
      original.cellType,
      original.promptId,
      original.image,
      original.model,
    );
  }
}