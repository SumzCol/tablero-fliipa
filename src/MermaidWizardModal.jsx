import { useEffect, useMemo, useState } from "react";
import { MermaidDiagram } from "./mermaidRender.jsx";
import { buildMermaidFromWizard, mermaidMarkdownBlock } from "./mermaidWizard.js";

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

function fieldLabel(C, text) {
  return {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.textFaint,
    marginBottom: 6,
    marginTop: 14,
  };
}

function textInput(C) {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: C.surfaceRaised,
    border: `1px solid ${C.borderSoft}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 13.5,
    padding: "8px 10px",
    outline: "none",
  };
}

function textArea(C) {
  return {
    ...textInput(C),
    resize: "vertical",
    minHeight: 88,
    lineHeight: 1.45,
    fontFamily: "inherit",
  };
}

export default function MermaidWizardModal({ C, onClose }) {
  const [kind, setKind] = useState("flowchart-lr");
  const [title, setTitle] = useState("Arquitectura del sistema");
  const [nodesText, setNodesText] = useState("Portal web\nAPI Gateway\nServicio de tareas\nPostgreSQL");
  const [connectMode, setConnectMode] = useState("chain");
  const [linksText, setLinksText] = useState("Portal web --> API Gateway\nAPI Gateway --> Servicio de tareas");
  const [seqParticipants, setSeqParticipants] = useState("Usuario\nAPI\nBase de datos");
  const [seqMessages, setSeqMessages] = useState("Usuario->>API: Crear tarea\nAPI->>Base de datos: INSERT\nBase de datos-->>API: OK\nAPI-->>Usuario: 201");
  const [pieSlices, setPieSlices] = useState("Frontend : 30\nBackend : 45\nDatos : 25");
  const [exportMode, setExportMode] = useState("block");
  const [copied, setCopied] = useState(false);
  const [previewCode, setPreviewCode] = useState("");

  const wizardCfg = useMemo(
    () => ({
      kind,
      title,
      nodesText,
      linksText,
      connectMode,
      seqParticipants,
      seqMessages,
      pieSlices,
    }),
    [kind, title, nodesText, linksText, connectMode, seqParticipants, seqMessages, pieSlices]
  );

  const mermaidSource = useMemo(() => buildMermaidFromWizard(wizardCfg), [wizardCfg]);

  useEffect(() => {
    const t = window.setTimeout(() => setPreviewCode(mermaidSource), 300);
    return () => window.clearTimeout(t);
  }, [mermaidSource]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCopy() {
    const payload = exportMode === "block" ? mermaidMarkdownBlock(mermaidSource) : mermaidSource;
    const ok = await copyPlainText(payload);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  const isFlow = kind === "flowchart-lr" || kind === "flowchart-tb";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        background: "rgba(6,8,12,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Asistente Mermaid"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1080px, 98vw)",
          height: "min(90vh, 880px)",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${C.borderSoft}`,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Asistente Mermaid</div>
            <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 2 }}>
              Arma el diagrama por bloques, revisa la vista previa y copia el código a tus notas.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: "none", border: "none", color: C.textFaint, fontSize: 22, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.1fr)",
            gap: 0,
          }}
        >
          <div style={{ overflowY: "auto", padding: "8px 18px 18px", borderRight: `1px solid ${C.borderSoft}` }}>
            <label style={fieldLabel(C, "Tipo")}>Tipo de diagrama</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={textInput(C)}>
              <option value="flowchart-lr">Flujo horizontal (izq → der)</option>
              <option value="flowchart-tb">Flujo vertical (arriba → abajo)</option>
              <option value="sequence">Secuencia (mensajes)</option>
              <option value="pie">Pastel (proporciones)</option>
            </select>

            {isFlow && (
              <>
                <label style={fieldLabel(C, "Componentes")}>Componentes</label>
                <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 6px", lineHeight: 1.4 }}>
                  Un nombre por línea. Ej: <code style={{ color: C.textMuted }}>API Gateway</code>
                </p>
                <textarea value={nodesText} onChange={(e) => setNodesText(e.target.value)} style={textArea(C)} rows={6} />

                <label style={fieldLabel(C, "Conexiones")}>Conexiones</label>
                <select value={connectMode} onChange={(e) => setConnectMode(e.target.value)} style={{ ...textInput(C), marginBottom: 8 }}>
                  <option value="chain">En cadena (cada uno con el siguiente)</option>
                  <option value="manual">Manual (tú defines las flechas)</option>
                </select>
                {connectMode === "manual" && (
                  <>
                    <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 6px", lineHeight: 1.4 }}>
                      Una flecha por línea: <code style={{ color: C.textMuted }}>Origen --&gt; Destino</code> (nombres exactos)
                    </p>
                    <textarea value={linksText} onChange={(e) => setLinksText(e.target.value)} style={textArea(C)} rows={5} />
                  </>
                )}
              </>
            )}

            {kind === "sequence" && (
              <>
                <label style={fieldLabel(C, "Participantes")}>Participantes</label>
                <textarea value={seqParticipants} onChange={(e) => setSeqParticipants(e.target.value)} style={textArea(C)} rows={4} />
                <label style={fieldLabel(C, "Mensajes")}>Mensajes</label>
                <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 6px", lineHeight: 1.4 }}>
                  Formato: <code style={{ color: C.textMuted }}>Origen-&gt;&gt;Destino: texto</code>
                </p>
                <textarea value={seqMessages} onChange={(e) => setSeqMessages(e.target.value)} style={textArea(C)} rows={6} />
              </>
            )}

            {kind === "pie" && (
              <>
                <label style={fieldLabel(C, "Título")}>Título del pastel</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={textInput(C)} />
                <label style={fieldLabel(C, "Porciones")}>Porciones</label>
                <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 6px", lineHeight: 1.4 }}>
                  Una por línea: <code style={{ color: C.textMuted }}>Nombre : 40</code>
                </p>
                <textarea value={pieSlices} onChange={(e) => setPieSlices(e.target.value)} style={textArea(C)} rows={5} />
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, padding: "14px 18px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textFaint, marginBottom: 8 }}>
              Vista previa
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 200,
                overflow: "auto",
                border: `1px solid ${C.borderSoft}`,
                borderRadius: 10,
                background: C.surfaceRaised,
                padding: 8,
              }}
            >
              <MermaidDiagram code={previewCode || mermaidSource} minHeight={180} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textFaint, margin: "14px 0 8px" }}>
              Código generado
            </div>
            <pre
              style={{
                margin: 0,
                maxHeight: 140,
                overflow: "auto",
                padding: "10px 12px",
                borderRadius: 8,
                background: C.surfaceRaised,
                border: `1px solid ${C.borderSoft}`,
                fontSize: 12,
                lineHeight: 1.45,
                color: C.textMuted,
              }}
            >
              {mermaidSource}
            </pre>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.textMuted }}>
                <input type="radio" checked={exportMode === "block"} onChange={() => setExportMode("block")} />
                Bloque markdown
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.textMuted }}>
                <input type="radio" checked={exportMode === "raw"} onChange={() => setExportMode("raw")} />
                Solo Mermaid
              </label>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  marginLeft: "auto",
                  background: C.accentSoft,
                  border: `1px solid ${C.accent}`,
                  color: C.text,
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {copied ? "Copiado al portapapeles" : "Copiar para notas"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
