"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNextCell = createNextCell;
exports.writePrompt = writePrompt;
exports.writeResponse = writeResponse;
exports.readAllCells = readAllCells;
const fs = require("fs");
const path = require("path");
function createNextCell(notebookPath) {
    const cells = fs.readdirSync(notebookPath)
        .filter(name => name.startsWith("cell-"));
    const nextIndex = cells.length + 1;
    const cellId = `cell-${String(nextIndex).padStart(2, "0")}`;
    const cellPath = path.join(notebookPath, cellId);
    fs.mkdirSync(cellPath);
    return { cellId, cellPath };
}
function writePrompt(cellPath, content) {
    const filePath = path.join(cellPath, "prompt.json");
    fs.writeFileSync(filePath, JSON.stringify({
        timestamp: new Date().toISOString(),
        content,
        status: "completed"
    }, null, 2));
}
function writeResponse(cellPath, content) {
    const filePath = path.join(cellPath, "response.json");
    fs.writeFileSync(filePath, JSON.stringify({
        timestamp: new Date().toISOString(),
        content,
        model: "mock-llm"
    }, null, 2));
}
function readAllCells(notebookPath) {
    const fs = require("fs");
    const path = require("path");
    const cells = fs.readdirSync(notebookPath)
        .filter((name) => name.startsWith("cell-"))
        .sort();
    return cells.map((cellId) => {
        const cellPath = path.join(notebookPath, cellId);
        const promptPath = path.join(cellPath, "prompt.json");
        const responsePath = path.join(cellPath, "response.json");
        const prompt = fs.existsSync(promptPath)
            ? JSON.parse(fs.readFileSync(promptPath, "utf-8"))
            : null;
        const response = fs.existsSync(responsePath)
            ? JSON.parse(fs.readFileSync(responsePath, "utf-8"))
            : null;
        return {
            cellId,
            prompt,
            response
        };
    });
}
