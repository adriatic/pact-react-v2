import React, { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import type { SerializedContentBlock } from "../types/contentBlock";
import { RateLimitError } from "@anthropic-ai/sdk";

type LLMModel = "gpt" | "claude";

type CellEvent =
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

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// ─── Serialize contenteditable DOM → ContentBlock[] ──────────────────────────

function serializeComposer(
  el: HTMLDivElement
): SerializedContentBlock[] {
  const blocks: SerializedContentBlock[] = [];

  function collectText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if ((node as HTMLElement).tagName === "BR") return "\n";
    return Array.from(node.childNodes).map(collectText).join("");
  }

  for (const child of Array.from(el.childNodes)) {
    const el2 = child as HTMLElement;

    if (el2.tagName === "IMG") {
      const src = el2.getAttribute("src") || "";
      const mimeType = el2.getAttribute("data-mime") || "image/png";
      const base64 = src.split(",")[1] || "";
      if (base64) {
        blocks.push({ type: "image", base64, mimeType });
      }
    } else {
      const text = collectText(child);
      if (text) {
        // Merge with previous text block if possible
        const last = blocks[blocks.length - 1];
        if (last && last.type === "text") {
          last.text += text;
        } else {
          blocks.push({ type: "text", text });
        }
      }
    }
  }

  // Filter out empty text blocks
  return blocks.filter(b => !(b.type === "text" && !b.text.trim()));
}

// ─── Insert image into contenteditable at cursor ──────────────────────────────

function insertImageAtCursor(base64: string, mimeType: string) {
  const img = document.createElement("img");
  img.src = `data:${mimeType};base64,${base64}`;
  img.setAttribute("data-mime", mimeType);
  img.style.cssText =
    "max-height:120px;max-width:100%;display:block;margin:4px auto;border-radius:4px;border:1px solid #666;";
  img.contentEditable = "false";

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// ─── Encode File → base64 ────────────────────────────────────────────────────

function encodeFile(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject(new Error(`Unsupported image type: ${file.type}`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1], mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const vscode = acquireVsCodeApi();
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [rawCells, setRawCells] = useState<Record<string, boolean>>({});
  const [model, setModel] = useState<LLMModel>("gpt");
  const [modelOpen, setModelOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleRaw(cellId: string) {
    setRawCells(prev => ({ ...prev, [cellId]: !prev[cellId] }));
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  function send() {
    const el = composerRef.current;
    if (!el) return;

    let blocks = serializeComposer(el);

    if (blocks.length === 0) {
      const text = el.innerText?.trim();
      if (text) {
        blocks = [{ type: "text", text }];
      }
    }
    if (blocks.length === 0) return;
    
    vscode.postMessage({
      type: "RUN_REQUESTED",
      blocks,
      model,
    });

    el.innerHTML = "";
    el.focus();
  }

  function retry(cellId: string) {
    vscode.postMessage({ type: "RETRY_CELL", cellId });
  }

  // ── Keyboard: Cmd+Enter to send, Enter for newline ────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  // ── Paste: intercept images, pass text through ────────────────────────────

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;

    async function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (ACCEPTED_TYPES.includes(item.type)) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          try {
            const { base64, mimeType } = await encodeFile(file);
            insertImageAtCursor(base64, mimeType);
          } catch (err: any) {
            console.error("Paste error:", err.message);
          }
          return;
        }
      }
      // Non-image paste: let browser handle it naturally
    }

    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
  }, []);

  // ── Drag and drop ─────────────────────────────────────────────────────────

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
      const { base64, mimeType } = await encodeFile(file);
      composerRef.current?.focus();
      insertImageAtCursor(base64, mimeType);
    } catch (err: any) {
      console.error("Drop error:", err.message);
    }
  }

  // ── File picker ───────────────────────────────────────────────────────────

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await encodeFile(file);
      composerRef.current?.focus();
      insertImageAtCursor(base64, mimeType);
    } catch (err: any) {
      console.error("File input error:", err.message);
    }
    e.target.value = "";
  }

  // ── Messages from extension host ──────────────────────────────────────────

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data: CellEvent = event.data;

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

  // ── Tree ──────────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>PACT</h2>

      {/* Composer */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? "2px dashed #888" : "1px solid #666",
          borderRadius: 6,
          marginBottom: 20,
          background: "#1e1e1e",
        }}
      >
        {/* Editable area */}
        <div
          ref={composerRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          style={{
            minHeight: 60,
            maxHeight: 300,
            overflowY: "auto",
            padding: "10px 12px",
            outline: "none",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            color: "#d4d4d4",
          }}
          data-placeholder="Enter prompt or /prompt N — Cmd+V to paste image, Cmd+Enter to send"
        />

        {/* Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          borderTop: "1px solid #444",
        }}>
          {/* Left: file picker */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "1.1em" }}
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
          </div>

          {/* Right: model selector + send */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Model selector */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setModelOpen(p => !p)}
                style={{
                  background: "none",
                  border: "1px solid #555",
                  borderRadius: 4,
                  color: "#ccc",
                  cursor: "pointer",
                  padding: "2px 10px",
                  fontSize: "0.85em",
                }}
              >
                {model === "gpt" ? "GPT-4.1" : "Claude"} ▾
              </button>

              {modelOpen && (
                <div style={{
                  position: "absolute",
                  bottom: "110%",
                  right: 0,
                  background: "#2d2d2d",
                  border: "1px solid #555",
                  borderRadius: 4,
                  minWidth: 130,
                  zIndex: 10,
                }}>
                  {(["gpt", "claude"] as LLMModel[]).map(m => (
                    <div
                      key={m}
                      onClick={() => { setModel(m); setModelOpen(false); }}
                      style={{
                        padding: "6px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#ccc",
                      }}
                    >
                      <span style={{ opacity: model === m ? 1 : 0 }}>✓</span>
                      {m === "gpt" ? "GPT-4.1" : "Claude Sonnet"}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={send}
              title="Send (Cmd+Enter)"
              style={{
                background: "#0e639c",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                cursor: "pointer",
                color: "#fff",
                fontSize: "1em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder styling */}
      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #555;
          pointer-events: none;
        }
      `}</style>

      {/* Cell tree */}
      <div>{tree.map(root => renderNode(root))}</div>
    </div>
  );
}