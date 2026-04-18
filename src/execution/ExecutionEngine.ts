import { eventBus } from "./eventBus";
import { LLMRouter } from "../llm/llmRouter";

type Cell = {
  id: string;
  parentId?: string;
  prompt: string;
  label?: string;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ExecutionEngine {
  private cells: Record<string, Cell> = {};
  private isRunning = false;
  private router: LLMRouter;

  constructor(router: LLMRouter) {
    this.router = router;
  }

  async runPrompt(prompt: string, parentId?: string) {
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

    this.cells[cellId] = { id: cellId, parentId, prompt, label: "GPT" };

    try {
      eventBus.emit({
        type: "cellStarted",
        cellId,
        parentId,
        label: "GPT",
      });

      await this.router.run("gpt", prompt, (token) => {
        eventBus.emit({
          type: "cellStream",
          cellId,
          chunk: token,
        });
      });

      eventBus.emit({
        type: "cellCompleted",
        cellId,
      });

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
    return this.runPrompt(original.prompt, original.parentId);
  }
}