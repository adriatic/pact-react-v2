import React, { useState } from "react";

type Cell = {
  id: string;
  parentId: string | null;
  prompt: string;
  response: string;
  status: "running" | "completed" | "stopped";
};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function App() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // 👉 NEW: Editable Retry state
  const [draftParentId, setDraftParentId] = useState<string | null>(null);

  // ----------------------------------------
  // Execution (mock streaming)
  // ----------------------------------------
  function runCell(newCell: Cell) {
    setIsRunning(true);

    setCells((prev) => [...prev, newCell]);

    const parent = cells.find((c) => c.id === newCell.parentId);

    let response = "";

    const interval = setInterval(() => {
      response += ".";

      setCells((prev) =>
        prev.map((c) => (c.id === newCell.id ? { ...c, response } : c)),
      );
    }, 100);

    setTimeout(() => {
      clearInterval(interval);

      const finalResponse = parent
        ? `Echo: ${parent.response} → ${newCell.prompt}`
        : `Echo: ${newCell.prompt}`;

      setCells((prev) =>
        prev.map((c) =>
          c.id === newCell.id
            ? { ...c, response: finalResponse, status: "completed" }
            : c,
        ),
      );

      setIsRunning(false);
    }, 800);
  }

  // ----------------------------------------
  // Run button
  // ----------------------------------------
  function handleRun() {
    if (!input.trim() || isRunning) return;

    const parentId = draftParentId ?? null;

    const newCell: Cell = {
      id: generateId(),
      parentId,
      prompt: input,
      response: "",
      status: "running",
    };

    runCell(newCell);

    setInput("");
    setDraftParentId(null); // ✅ exit retry mode
  }

  // ----------------------------------------
  // Retry (EDIT MODE, no execution)
  // ----------------------------------------
  function handleRetry(cell: Cell) {
    if (isRunning) return;

    setInput(cell.prompt);
    setDraftParentId(cell.id);
  }

  // ----------------------------------------
  // Cancel Retry
  // ----------------------------------------
  function cancelRetry() {
    setDraftParentId(null);
    setInput("");
  }

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>PACT</h2>

      {/* 🔶 Retry Banner */}
      {draftParentId && (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            background: "#333",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Editing retry of Cell {draftParentId}</span>
          <button onClick={cancelRetry}>Cancel</button>
        </div>
      )}

      {/* Cells */}
      {cells.map((cell) => (
        <div
          key={cell.id}
          style={{
            border: "1px solid #555",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <b>Cell</b>
          </div>
          <div>ID: {cell.id}</div>
          <div>Parent: {cell.parentId ?? "None"}</div>
          <div>Prompt: {cell.prompt}</div>
          <div>Response: {cell.response}</div>
          <div>
            Status: {cell.status === "completed" ? "✅ Completed" : cell.status}
          </div>

          {!isRunning && (
            <button onClick={() => handleRetry(cell)}>Retry</button>
          )}
        </div>
      ))}

      {/* Input */}
      <div style={{ display: "flex", marginTop: 20 }}>
        <input
          style={{ flex: 1, padding: 10 }}
          placeholder="Enter prompt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{ marginLeft: 10 }}
        >
          Run
        </button>
      </div>
    </div>
  );
}
