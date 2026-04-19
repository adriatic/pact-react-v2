"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
const eventBus_1 = require("./eventBus");
function generateId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
class ExecutionEngine {
    constructor(router) {
        this.cells = {};
        this.isRunning = false;
        this.router = router;
    }
    async runPrompt(prompt, parentId, label) {
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
        this.cells[cellId] = { id: cellId, parentId, prompt, label: cellLabel };
        try {
            eventBus_1.eventBus.emit({
                type: "cellStarted",
                cellId,
                parentId,
                label: cellLabel,
            });
            await this.router.run("gpt", prompt, (token) => {
                eventBus_1.eventBus.emit({
                    type: "cellStream",
                    cellId,
                    chunk: token,
                });
            });
            eventBus_1.eventBus.emit({
                type: "cellCompleted",
                cellId,
            });
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
        return this.runPrompt(original.prompt, original.parentId, original.label);
    }
}
exports.ExecutionEngine = ExecutionEngine;
