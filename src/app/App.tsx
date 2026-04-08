import { useEffect, useState } from "react";

declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void;
};

const vscode =
  typeof acquireVsCodeApi === "function"
    ? acquireVsCodeApi()
    : null;

type Cell = {
  prompt: string;
  response?: string;
  status: "running" | "done";
};

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [cells, setCells] = useState<Cell[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;

      // 🔥 LOAD PERSISTED CELLS
      if (message?.type === "loadCells") {
        const loaded: Cell[] = (message.payload || []).map((c: any) => ({
          prompt: c.prompt,
          response: c.response,
          status: "done",
        }));

        setCells(loaded);

        if (loaded.length > 0) {
          setCurrentIndex(loaded.length - 1);
        }
      }

      // 🔥 ADD NEW CELL
      if (message?.type === "addCell") {
        setCells((prev) => {
          const updated = [
            ...prev,
            { prompt: message.payload, status: "running" as const },
          ];
          setCurrentIndex(updated.length - 1);
          return updated;
        });

        setIsRunning(true);
      }

      // 🔥 ADD RESPONSE
      if (message?.type === "addResponse") {
        setCells((prev) => {
          if (prev.length === 0) return prev;

          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            response: message.payload,
            status: "done",
          };
          return updated;
        });

        setIsRunning(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // 🔥 KEYBOARD NAVIGATION (LOCKED DURING RUN)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (cells.length === 0 || isRunning) return;

      if (e.key === "ArrowLeft") {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }

      if (e.key === "ArrowRight") {
        setCurrentIndex((i) =>
          Math.min(cells.length - 1, i + 1)
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cells.length, isRunning]);

  const handleRun = () => {
    if (isRunning || !prompt.trim()) return;

    if (vscode) {
      vscode.postMessage({
        type: "runPrompt",
        payload: prompt,
      });
    }

    setPrompt("");
  };

  const goPrev = () => {
    if (currentIndex <= 0 || isRunning) return;
    setCurrentIndex((i) => i - 1);
  };

  const goNext = () => {
    if (currentIndex >= cells.length - 1 || isRunning) return;
    setCurrentIndex((i) => i + 1);
  };

  const currentCell =
    currentIndex >= 0 ? cells[currentIndex] : null;

  const atFirst = currentIndex <= 0;
  const atLast = currentIndex >= cells.length - 1;

  return (
    <div style={{ padding: 20 }}>
      {cells.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <strong>
            Cell {currentIndex + 1} / {cells.length}
          </strong>

          <span style={{ marginLeft: 10 }}>
            <button
              onClick={goPrev}
              disabled={atFirst || isRunning}
              style={{
                opacity: atFirst || isRunning ? 0.3 : 1,
                cursor:
                  atFirst || isRunning ? "not-allowed" : "pointer",
              }}
            >
              ←
            </button>

            <button
              onClick={goNext}
              disabled={atLast || isRunning}
              style={{
                opacity: atLast || isRunning ? 0.3 : 1,
                cursor:
                  atLast || isRunning ? "not-allowed" : "pointer",
              }}
            >
              →
            </button>
          </span>

          <span
            style={{
              marginLeft: 15,
              fontWeight: "bold",
              color: isRunning ? "red" : "green",
            }}
          >
            ●
          </span>
        </div>
      )}

      {cells.length === 0 && <h2>No cells yet</h2>}

      {currentCell && (
        <div
          style={{
            padding: 10,
            border: "1px solid #444",
            marginBottom: 20,
          }}
        >
          <div>{currentCell.prompt}</div>

          {currentCell.status === "running" && (
            <div style={{ marginTop: 8, color: "#888" }}>
              Running...
            </div>
          )}

          {currentCell.status === "done" && (
            <div style={{ marginTop: 8, color: "#aaa" }}>
              {currentCell.response}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isRunning}
          placeholder="Enter prompt..."
          style={{
            padding: 10,
            border: "2px solid orange",
            flex: 1,
            backgroundColor: "#1e1e1e",
            color: "#ffffff",
            opacity: isRunning ? 0.6 : 1,
          }}
        />

        <button
          onClick={handleRun}
          disabled={isRunning || !prompt.trim()}
          title={
            isRunning
              ? "Execution in progress"
              : !prompt.trim()
              ? "Enter a prompt"
              : ""
          }
        >
          Run
        </button>
      </div>
    </div>
  );
}