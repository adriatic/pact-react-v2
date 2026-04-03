import { useEffect, useState } from "react";

type Cell = {
  prompt?: string;
  response?: string;
};

declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
  }
}

const vscode = window.acquireVsCodeApi?.();

export default function App() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.type === "SYNC_STATE") {
        console.log("SYNC_STATE received:", message.payload.cells);
        setCells(message.payload.cells || []);
      }
    });
  }, []);

  const runPrompt = () => {
    if (!input.trim()) return;

    vscode?.postMessage({
      type: "RUN_PROMPT",
      payload: { text: input },
    });

    setInput("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.history}>
        {cells.length === 0 && (
          <div style={styles.placeholder}>No cells yet</div>
        )}

        {cells.map((cell, index) => (
          <div key={index} style={styles.cell}>
            <div style={styles.prompt}>
              <strong>Prompt:</strong>
              <div>{cell.prompt}</div>
            </div>

            <div style={styles.response}>
              <strong>Response:</strong>
              <div>{cell.response}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.inputBar}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter prompt..."
        />

        <button style={styles.button} onClick={runPrompt}>
          Run
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#1e1e1e",
    color: "#ddd",
    fontFamily: "sans-serif",
  },
  history: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
  cell: {
    marginBottom: "16px",
    padding: "10px",
    border: "1px solid #333",
    borderRadius: "6px",
    background: "#252526",
  },
  prompt: {
    marginBottom: "8px",
    color: "#9cdcfe",
  },
  response: {
    color: "#ce9178",
  },
  inputBar: {
    display: "flex",
    borderTop: "1px solid #333",
    padding: "10px",
  },
  input: {
    flex: 1,
    padding: "8px",
    background: "#1e1e1e",
    color: "#ddd",
    border: "1px solid #555",
    borderRadius: "4px",
  },
  button: {
    marginLeft: "8px",
    padding: "8px 12px",
    background: "#0e639c",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  placeholder: {
    opacity: 0.5,
  },
};