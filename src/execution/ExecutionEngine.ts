import { eventBus, CellType } from "./eventBus";
import { LLMRouter } from "../llm/llmRouter";
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
    const cellLabel = label ?? "GPT";

    this.cells[cellId] = {
      id: cellId,
      parentId,
      prompt,
      label: cellLabel,
      cellType,
      promptId,
      image,
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
          // Replay canonical stored response token by token
          for (const char of stored.response) {
            eventBus.emit({ type: "cellStream", cellId, chunk: char });
          }
        } else {
          // First run — invoke LLM and store the response
          let full = "";

          await this.router.run("gpt", prompt, (token) => {
            full += token;
            eventBus.emit({ type: "cellStream", cellId, chunk: token });
          }, image);

          this.store.save(promptId, prompt, full, "gpt", cellType);
        }
      } else {
        // User cell — always invoke LLM
        let full = "";

        await this.router.run("gpt", prompt, (token) => {
          full += token;
          eventBus.emit({ type: "cellStream", cellId, chunk: token });
        }, image);

        this.store.save(cellId, prompt, full, "gpt", cellType,
          image?.base64, image?.mimeType);
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
    );
  }
}