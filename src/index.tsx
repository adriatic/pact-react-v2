import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  useEffect(() => {
    // ✅ Listen for messages from extension
    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.type === "response") {
        setResponse(message.text);
      }
    });
  }, []);

  const run = () => {
    const vscode = (window as any).vscode;

    vscode.postMessage({
      type: "runPrompt",
      promptText: prompt
    });

    setPrompt(""); // preserve your current behavior
  };

  return (
    <div>
      <h2>PACT</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button onClick={run}>Run</button>

      <div>{response}</div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);