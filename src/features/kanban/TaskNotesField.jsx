import { memo, useEffect, useMemo, useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./mermaidRender.jsx";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const REMARK_GFM_PLUGINS = [remarkGfm];

function createMarkdownComponents(C) {
  return {
    code({ inline, className, children, ...props }) {
      const text = String(children).replace(/\n$/, "");
      const lang = /language-(\w+)/.exec(className || "");
      if (!inline && lang?.[1] === "mermaid") {
        return <MermaidDiagram code={text} style={{ margin: "12px 0" }} />;
      }
      if (inline) {
        return (
          <code
            {...props}
            style={{
              fontSize: "0.9em",
              padding: "1px 5px",
              borderRadius: 4,
              background: C.surfaceRaised,
              border: `1px solid ${C.borderSoft}`,
            }}
          >
            {children}
          </code>
        );
      }
      return (
        <pre
          style={{
            margin: "10px 0",
            padding: "10px 12px",
            borderRadius: 8,
            background: C.surfaceRaised,
            border: `1px solid ${C.borderSoft}`,
            overflowX: "auto",
            fontSize: 12.5,
            lineHeight: 1.45,
          }}
        >
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" style={{ color: C.accent }}>
          {children}
        </a>
      );
    },
    blockquote({ children }) {
      return (
        <blockquote
          style={{
            margin: "10px 0",
            padding: "6px 12px",
            borderLeft: `3px solid ${C.accent}`,
            color: C.textMuted,
          }}
        >
          {children}
        </blockquote>
      );
    },
    table({ children }) {
      return (
        <div style={{ overflowX: "auto", margin: "10px 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th
          style={{
            textAlign: "left",
            padding: "6px 8px",
            borderBottom: `1px solid ${C.border}`,
            color: C.text,
          }}
        >
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td
          style={{
            padding: "6px 8px",
            borderBottom: `1px solid ${C.borderSoft}`,
            color: C.textMuted,
          }}
        >
          {children}
        </td>
      );
    },
  };
}

function useMarkdownComponents(C) {
  return useMemo(
    () => createMarkdownComponents(C),
    [C.surfaceRaised, C.borderSoft, C.accent, C.text, C.border, C.textMuted]
  );
}

const NotesMarkdownPreview = memo(
  function NotesMarkdownPreview({ value, C }) {
    const components = useMarkdownComponents(C);
    return (
      <ReactMarkdown remarkPlugins={REMARK_GFM_PLUGINS} components={components}>
        {value}
      </ReactMarkdown>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.C.surfaceRaised === next.C.surfaceRaised &&
    prev.C.borderSoft === next.C.borderSoft &&
    prev.C.accent === next.C.accent &&
    prev.C.text === next.C.text &&
    prev.C.border === next.C.border &&
    prev.C.textMuted === next.C.textMuted
);

function modeToggleBtn(C, active, label, onClick, disabled) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: "6px 10px",
        fontSize: 12.5,
        fontWeight: 700,
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        border: `1px solid ${active ? C.accent : C.borderSoft}`,
        background: active ? C.accentSoft : C.surfaceRaised,
        color: active ? C.text : C.textMuted,
      }}
    >
      {label}
    </button>
  );
}

function ExpandNotesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 3H3v5M16 3h5v5M16 21h5v-5M8 21H3v-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotesExpandButton({ C, onClick, title = "Expandir notas" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        position: "absolute",
        right: 8,
        bottom: 8,
        zIndex: 4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${C.borderSoft}`,
        background: C.surface,
        color: C.textMuted,
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <ExpandNotesIcon />
    </button>
  );
}

function NotesBody({
  C,
  value,
  onChange,
  mode,
  editorMinHeight,
  placeholder,
  previewMaxHeight,
  showExpandButton,
  onExpand,
}) {
  const previewStyle = {
    minHeight: editorMinHeight,
    maxHeight: previewMaxHeight,
    overflowY: previewMaxHeight ? "auto" : undefined,
    padding: "12px 14px",
    paddingBottom: showExpandButton ? 44 : 12,
    borderRadius: 8,
    border: `1px solid ${C.borderSoft}`,
    background: C.surfaceRaised,
    color: C.text,
    fontSize: 13.5,
    lineHeight: 1.55,
  };

  if (mode === "edit") {
    return (
      <div style={{ position: "relative" }}>
        <div
          className="fliipa-md-editor-wrap"
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${C.borderSoft}`,
            ["--md-editor-bg-color"]: C.surfaceRaised,
            ["--md-editor-border-color"]: C.borderSoft,
          }}
        >
          <MDEditor
            value={value}
            onChange={(next) => onChange(typeof next === "string" ? next : "")}
            preview="edit"
            height={editorMinHeight}
            visibleDragbar={false}
            textareaProps={{ placeholder }}
          />
        </div>
        {showExpandButton && <NotesExpandButton C={C} onClick={onExpand} />}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="fliipa-md-preview" style={previewStyle}>
        {value.trim() ? (
          <NotesMarkdownPreview value={value} C={C} />
        ) : (
          <span style={{ color: C.textFaint, fontStyle: "italic" }}>Sin notas todavía.</span>
        )}
      </div>
      {showExpandButton && <NotesExpandButton C={C} onClick={onExpand} title="Expandir vista de notas" />}
    </div>
  );
}

function NotesModeToggleRow({ C, mode, switching, onGoEdit, onGoView }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {modeToggleBtn(C, mode === "edit", "Editar", onGoEdit, switching)}
      {modeToggleBtn(C, mode === "view", "Ver", onGoView, switching)}
    </div>
  );
}

function NotesExpandedModal({ C, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        background: "rgba(6,8,12,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notas ampliadas"
        onClick={(e) => e.stopPropagation()}
        data-color-mode="dark"
        style={{
          width: "min(980px, 96vw)",
          height: "min(88vh, 920px)",
          display: "flex",
          flexDirection: "column",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${C.borderSoft}`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Notas</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: "none",
              border: "none",
              color: C.textFaint,
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: "14px 18px 18px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function CopyableTaskIdRow({ C, taskId }) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    if (!taskId) return;
    const ok = await copyPlainText(taskId);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.textFaint,
          marginBottom: 7,
        }}
      >
        ID de tarea
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${C.borderSoft}`,
          background: C.surfaceRaised,
        }}
      >
        <code
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            color: C.textMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            userSelect: "all",
          }}
        >
          {taskId}
        </code>
        <button
          type="button"
          onClick={copyId}
          style={{
            flexShrink: 0,
            background: C.surface,
            border: `1px solid ${C.border}`,
            color: C.text,
            borderRadius: 7,
            padding: "5px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

async function copyPlainText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback */
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function useNotesMode(onPersistBeforeView, notesResetKey) {
  const [mode, setMode] = useState("edit");
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setMode("edit");
  }, [notesResetKey]);

  async function goView() {
    if (mode === "view" || switching) return;
    setSwitching(true);
    try {
      if (onPersistBeforeView) {
        const ok = await onPersistBeforeView();
        if (ok === false) return;
      }
      setMode("view");
    } finally {
      setSwitching(false);
    }
  }

  function goEdit() {
    if (switching) return;
    setMode("edit");
  }

  return { mode, switching, goEdit, goView };
}

function NotesFieldPanel({
  C,
  value,
  onChange,
  mode,
  switching,
  goEdit,
  goView,
  editorMinHeight,
  previewMaxHeight,
  placeholder,
  showExpandButton,
  onExpand,
  flexFill,
}) {
  return (
    <div
      data-color-mode="dark"
      style={flexFill ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : undefined}
    >
      <NotesModeToggleRow C={C} mode={mode} switching={switching} onGoEdit={goEdit} onGoView={goView} />
      <div style={flexFill ? { flex: 1, minHeight: 0, overflow: "hidden" } : undefined}>
        <NotesBody
          C={C}
          value={value}
          onChange={onChange}
          mode={mode}
          editorMinHeight={editorMinHeight}
          previewMaxHeight={previewMaxHeight}
          placeholder={placeholder}
          showExpandButton={showExpandButton}
          onExpand={onExpand}
        />
      </div>
    </div>
  );
}

export default function TaskNotesField({
  C,
  value,
  onChange,
  onPersistBeforeView,
  editorMinHeight = 200,
  placeholder = "Notas de la tarea…",
  notesResetKey,
}) {
  const [expanded, setExpanded] = useState(false);
  const { mode, switching, goEdit, goView } = useNotesMode(onPersistBeforeView, notesResetKey);

  useEffect(() => {
    setExpanded(false);
  }, [notesResetKey]);

  const expandedEditorHeight = typeof window !== "undefined" ? Math.max(520, Math.round(window.innerHeight * 0.62)) : 560;

  return (
    <>
      <NotesFieldPanel
        C={C}
        value={value}
        onChange={onChange}
        mode={mode}
        switching={switching}
        goEdit={goEdit}
        goView={goView}
        editorMinHeight={editorMinHeight}
        placeholder={placeholder}
        showExpandButton
        onExpand={() => setExpanded(true)}
      />

      {expanded && (
        <NotesExpandedModal C={C} onClose={() => setExpanded(false)}>
          <NotesFieldPanel
            C={C}
            value={value}
            onChange={onChange}
            mode={mode}
            switching={switching}
            goEdit={goEdit}
            goView={goView}
            editorMinHeight={expandedEditorHeight}
            previewMaxHeight={expandedEditorHeight}
            placeholder={placeholder}
            showExpandButton={false}
            flexFill
          />
        </NotesExpandedModal>
      )}
    </>
  );
}
