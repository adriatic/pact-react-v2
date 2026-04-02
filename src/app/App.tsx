import { useEffect, useState } from "react";

// Bridge helper
type VSCodeApi = {
  postMessage: (msg: { type: string; payload: unknown }) => void;
};

function sendMessage(type: string, payload: unknown) {
  const vscode = (window as unknown as { acquireVsCodeApi?: () => VSCodeApi })
    .acquireVsCodeApi?.();

  if (!vscode) {
    console.warn("VSCode API not available");
    return;
  }

  vscode.postMessage({ type, payload });
}

export default function App() {
  const [cells, setCells] = useState<any[]>([]);
  const [promptText, setPromptText] = useState("");

  // 🔥 Listen for messages from extension
  useEffect(() => {
    console.log("✅ React is alive");
    console.log("📡 Attaching message listener");

    const handler = (event: MessageEvent) => {
      console.log("📨 RAW MESSAGE:", event.data);

      const message = event.data;

      if (message.type === "SYNC_STATE") {
        console.log("✅ SYNC_STATE RECEIVED:", message.payload);
        setCells(message.payload.cells);
      }
    };

    window.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);

  // 🔥 Send RUN_PROMPT to extension
  function handleExecute() {
    if (!promptText.trim()) return;

    console.log("🚀 Sending RUN_PROMPT:", promptText);

    sendMessage("RUN_PROMPT", {
      text: promptText
    });

    setPromptText("");
  }

  return (
    <div style={{ padding: "16px", color: "white" }}>
      <h2>PACT</h2>

      {/* INPUT */}
      <div style={{ marginBottom: "12px" }}>
        <input
          style={{
            width: "80%",
            padding: "8px",
            marginRight: "8px",
            background: "#111",
            color: "white",
            border: "1px solid #444"
          }}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Enter prompt..."
        />

        <button onClick={handleExecute}>
          Execute
        </button>
      </div>

      {/* CURRENT PROMPT */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Executed Prompt</h3>

        {cells.length > 0 && (
          <div style={{
            padding: "12px",
            border: "1px solid #333",
            background: "#0b1a2b"
          }}>
            {cells[cells.length - 1].prompt?.content}
          </div>
        )}
      </div>

      {/* CURRENT RESPONSE */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Latest Response</h3>

        {cells.length > 0 && (
          <div style={{
            padding: "12px",
            border: "1px solid #333",
            background: "#0b1a2b"
          }}>
            {cells[cells.length - 1].response?.content}
          </div>
        )}
      </div>

      {/* EXECUTION HISTORY */}
      <div>
        <h3>Execution History</h3>

        {cells.map((cell, index) => (
          <div
            key={cell.cellId}
            style={{
              marginBottom: "12px",
              padding: "12px",
              border: "1px solid #333",
              background: "#0b1a2b"
            }}
          >
            <div style={{ marginBottom: "6px" }}>
              <strong>Run #{index + 1}</strong>
            </div>

            <div style={{ opacity: 0.7 }}>
              {cell.prompt?.content}
            </div>

            <div>
              {cell.response?.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}