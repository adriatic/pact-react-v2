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
};

export default function App() {
  const [prompt, setPrompt] = useState("Who was mark twain");
  const [cells, setCells] = useState<Cell[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;

      console.log("UI RECEIVED:", message); // 🔍 DEBUG

      if (message?.type === "addCell") {
        setCells((prev) => [...prev, { prompt: message.payload }]);
      }

      if (message?.type === "addResponse") {
        setCells((prev) => {
          if (prev.length === 0) return prev;

          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            response: message.payload,
          };
          return updated;
        });
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleRun = () => {
    if (vscode) {
      vscode.postMessage({
        type: "runPrompt",
        payload: prompt,
      });
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>No cells yet</h2>

      <div style={{ marginBottom: 20 }}>
        {cells.map((cell, index) => (
          <div
            key={index}
            style={{
              padding: 10,
              border: "1px solid #444",
              marginBottom: 10,
            }}
          >
            <div>{cell.prompt}</div>
            {cell.response && (
              <div style={{ marginTop: 8, color: "#aaa" }}>
                {cell.response}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{
            padding: 10,
            border: "2px solid orange",
            flex: 1,
          }}
        />

        <button onClick={handleRun}>Run</button>
      </div>
    </div>
  );
}