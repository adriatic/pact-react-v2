import React, { useEffect, useRef, useState } from "react";
import { marked } from "marked";

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

type ImageAttachment = {
  base64: string;
  mimeType: string;
  previewUrl: string;
};

declare const acquireVsCodeApi: any;

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function App() {
  const vscode = acquireVsCodeApi();
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [prompt, setPrompt] = useState("");
  const [rawCells, setRawCells] = useState<Record<string, boolean>>({});
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleRaw(cellId: string) {
    setRawCells(prev => ({ ...prev, [cellId]: !prev[cellId] }));
  }

  function encodeFile(file: File): Promise<ImageAttachment> {
    return new Promise((resolve, reject) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        reject(new Error(`Unsupported image type: ${file.type}`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve({
          base64,
          mimeType: file.type,
          previewUrl: dataUrl,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function clearImage() {
    setImage(null);
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImage(await encodeFile(file));
    } catch (err: any) {
      console.error("Image load error:", err.message);
    }
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      setImage(await encodeFile(file));
    } catch (err: any) {
      console.error("Drop error:", err.message);
    }
  }

  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (ACCEPTED_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (!file) continue;
          try {
            setImage(await encodeFile(file));
          } catch (err: any) {
            console.error("Paste error:", err.message);
          }
          break;
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  function run() {
    if (!prompt.trim() && !image) return;

    vscode.postMessage({
      type: "RUN_REQUESTED",
      prompt,
      ...(image && {
        image: { base64: image.base64, mimeType: image.mimeType },
      }),
    });

    setPrompt("");
    setImage(null);
  }

  function retry(cellId: string) {
    vscode.postMessage({ type: "RETRY_CELL", cellId });
  }

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data: Event = event.data;

      switch (data.type) {
        case "cellStarted":
          setCells(prev => ({
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
          setCells(prev => ({
            ...prev,
            [data.cellId]: {
              ...prev[data.cellId],
              response: (prev[data.cellId]?.response || "") + data.chunk,
            },
          }));
          break;

        case "cellCompleted":
          setCells(prev => ({
            ...prev,
            [data.cellId]: { ...prev[data.cellId], status: "done" },
          }));
          break;

        case "cellError":
          setCells(prev => ({
            ...prev,
            [data.cellId]: { ...prev[data.cellId], status: "error" },
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

    Object.values(cells).forEach(cell => {
      map[cell.id] = { ...cell, children: [] };
    });

    Object.values(map).forEach(node => {
      if (node.parentId && map[node.parentId]) {
        map[node.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  function renderNode(node: TreeNode, depth = 0) {
    const isRaw = rawCells[node.id] ?? false;
    const html = marked(node.response || "") as string;

    return (
      <div key={node.id} style={{ marginLeft: depth * 20 }}>
        <div style={{ border: "1px solid #888", padding: 10, marginBottom: 10 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}>
            <strong>{node.label || "GPT"}</strong>
            <button
              onClick={() => toggleRaw(node.id)}
              style={{ fontSize: "0.75em", padding: "2px 8px" }}
            >
              {isRaw ? "Formatted" : "Raw"}
            </button>
          </div>

          {isRaw ? (
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {node.response}
            </pre>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ lineHeight: 1.6 }}
            />
          )}

          <div style={{ marginTop: 6, fontSize: "0.85em", color: "#888" }}>
            Status: {node.status}
          </div>

          {node.status === "done" && (
            <button onClick={() => retry(node.id)}>Retry</button>
          )}
        </div>

        {node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  const tree = buildTree();

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>PACT</h2>

      {/* Input area with drag and drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          marginBottom: 20,
          border: isDragging ? "2px dashed #888" : "2px solid transparent",
          borderRadius: 4,
          padding: 4,
        }}
      >
        {/* Image preview */}
        {image && (
          <div style={{ marginBottom: 8, position: "relative", display: "inline-block" }}>
            <img
              src={image.previewUrl}
              alt="attachment"
              style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 4, border: "1px solid #888" }}
            />
            <button
              onClick={clearImage}
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                background: "#333",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 20,
                height: 20,
                cursor: "pointer",
                fontSize: "0.75em",
                lineHeight: "20px",
                textAlign: "center",
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Prompt row */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") run(); }}
            placeholder="Enter prompt or /prompt N — paste or drop image"
            style={{ flex: 1 }}
          />

          {/* File picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            style={{ padding: "2px 8px" }}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />

          <button onClick={run}>Run</button>
        </div>
      </div>

      <div>{tree.map(root => renderNode(root))}</div>
    </div>
  );
}