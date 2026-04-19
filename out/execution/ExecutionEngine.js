"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
const eventBus_1 = require("./eventBus");
const responseStore_1 = require("../storage/responseStore");
function generateId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
class ExecutionEngine {
    constructor(router, extensionPath) {
        this.cells = {};
        this.isRunning = false;
        this.router = router;
        this.store = new responseStore_1.ResponseStore(extensionPath);
    }
    async runPrompt(prompt, parentId, label, cellType = "user", promptId) {
        if (this.isRunning) {
            eventBus_1.eventBus.emit({
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
        };
        try {
            eventBus_1.eventBus.emit({
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
                    for (const char of stored) {
                        eventBus_1.eventBus.emit({ type: "cellStream", cellId, chunk: char });
                    }
                }
                else {
                    // First run — invoke LLM and store the response
                    let full = "";
                    await this.router.run("gpt", prompt, (token) => {
                        full += token;
                        eventBus_1.eventBus.emit({ type: "cellStream", cellId, chunk: token });
                    });
                    this.store.save(promptId, prompt, full);
                }
            }
            else {
                // User cell — always invoke LLM
                await this.router.run("gpt", prompt, (token) => {
                    eventBus_1.eventBus.emit({ type: "cellStream", cellId, chunk: token });
                });
            }
            eventBus_1.eventBus.emit({ type: "cellCompleted", cellId });
        }
        catch (err) {
            eventBus_1.eventBus.emit({
                type: "cellError",
                cellId,
                error: err?.message || "LLM error",
            });
        }
        finally {
            this.isRunning = false;
        }
    }
    async retryCell(cellId) {
        const original = this.cells[cellId];
        if (!original)
            return;
        return this.runPrompt(original.prompt, original.parentId, original.label, original.cellType, original.promptId);
    }
}
exports.ExecutionEngine = ExecutionEngine;
