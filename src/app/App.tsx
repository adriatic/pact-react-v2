import React, { useEffect, useState } from "react";

type Event =
  | { type: "cellStarted"; cellId: string; parentId?: string; label?: string }
  | { type: "cellStream"; cellId: string; chunk: string }
  | { type: "cellCompleted"; cellId: string }
  | { type: "cellError"; cellId: string; error: string };

type Cell = {
  id: string;
  parentId?: string;
  label?: string;
  response: string;
  status?: string;
};

type TreeNode = Cell & {
  children: TreeNode[];
};

declare const acquireVsCodeApi: any;

export default function App() {
  const vscode = acquireVsCodeApi();
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [prompt, setPrompt] = useState("");

  function run() {
    vscode.postMessage({
      type: "RUN_REQUESTED",
      prompt,
    });
  }

  function retry(cellId: string) {
    vscode.postMessage({
      type: "RETRY_CELL",
      cellId,
    });
  }

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data: Event = event.data;

      switch (data.type) {
        case "cellStarted":
          setCells((prev) => ({
            ...prev,
            [data.cellId]: {
              id: data.cellId,
              parentId: data.parentId,
              label: data.label,
              response: "",
              status: "running",
            },
          }));
          break;

        case "cellStream":
          setCells((prev) => ({
            ...prev,
            [data.cellId]: {
              ...prev[data.cellId],
              response: (prev[data.cellId]?.response || "") + data.chunk,
            },
          }));
          break;

        case "cellCompleted":
          setCells((prev) => ({
            ...prev,
            [data.cellId]: {
              ...prev[data.cellId],
              status: "done",
            },
          }));
          break;

        case "cellError":
          setCells((prev) => ({
            ...prev,
            [data.cellId]: {
              ...prev[data.cellId],
              status: "error",
            },
          }));
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

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
            border: "1px solid #888",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <strong>{node.label || "GPT"}</strong>
          </div>

          <pre>{node.response}</pre>

          <div>Status: {node.status}</div>

          {node.status === "done" && (
            <button onClick={() => retry(node.id)}>Retry</button>
          )}
        </div>

        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  const tree = buildTree();

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>PACT</h2>

      <div style={{ marginBottom: 20 }}>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt"
          style={{ width: "70%", marginRight: 10 }}
        />
        <button onClick={run}>Run</button>
      </div>

      <div>
        {tree.map((root) => renderNode(root))}
      </div>
    </div>
  );
}