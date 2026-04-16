import React, { useEffect, useState } from "react";

type Cell = {
  id: string;
  parentId?: string;
  content: string;
  status: "running" | "done" | "error";
  label?: string;
};

type TreeNode = Cell & {
  children: TreeNode[];
};

declare global {
  interface Window {
    vscode: any;
  }
}

export default function App() {
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [input, setInput] = useState("");

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const msg = event.data;

      switch (msg.type) {
        case "cellStarted":
          setCells((prev) => ({
            ...prev,
            [msg.cellId]: {
              id: msg.cellId,
              parentId: msg.parentId,
              content: "",
              status: "running",
              label: msg.label
            }
          }));
          break;

        case "cellStream":
          setCells((prev) => ({
            ...prev,
            [msg.cellId]: {
              ...prev[msg.cellId],
              content: prev[msg.cellId].content + msg.chunk
            }
          }));
          break;

        case "cellCompleted":
          setCells((prev) => ({
            ...prev,
            [msg.cellId]: {
              ...prev[msg.cellId],
              status: "done"
            }
          }));
          break;
      }
    });
  }, []);

  function runPrompt() {
    if (!input.trim()) return;

    window.vscode.postMessage({
      type: "runPrompt",
      promptText: input
    });

    setInput("");
  }

  function retry(cellId: string) {
    window.vscode.postMessage({
      type: "retryCell",
      cellId
    });
  }

  function buildTree(): TreeNode[] {
    const map: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];

    Object.values(cells).forEach((cell) => {
      map[cell.id] = { ...cell, children: [] };
    });

    Object.values(map).forEach((node) => {
      if (node.parentId && map[node.parentId]) {
        map[node.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  function renderNode(node: TreeNode, depth = 0) {
    return (
      <div key={node.id} style={{ marginLeft: depth * 20 }}>
        <div
          style={{
            border: "1px solid gray",
            padding: 10,
            marginBottom: 10
          }}
        >
          <div>
            <strong>
              {node.label ? `${node.label}` : "Cell"} {node.id}
            </strong>
          </div>

          <pre>{node.content}</pre>
          <div>Status: {node.status}</div>

          <button onClick={() => retry(node.id)}>
            Retry
          </button>
        </div>

        {node.children.map((child) =>
          renderNode(child, depth + 1)
        )}
      </div>
    );
  }

  const tree = buildTree();

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid #444",
          background: "#1e1e1e"
        }}
      >
        <h2 style={{ margin: 0 }}>PACT</h2>

        <div style={{ marginTop: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ width: "70%" }}
          />
          <button onClick={runPrompt}>Run</button>
        </div>
      </div>

      <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
        {tree.map((root) => renderNode(root))}
      </div>
    </div>
  );
}