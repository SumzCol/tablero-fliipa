import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import mermaid from "mermaid";

let mermaidReady = false;
const mermaidSvgCache = new Map();

export function ensureMermaid() {
  if (mermaidReady) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    fontFamily: "Inter, system-ui, sans-serif",
  });
  mermaidReady = true;
}

function hashDiagramCode(code) {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export const MermaidDiagram = memo(function MermaidDiagram({ code, minHeight = 48, style }) {
  const hostRef = useRef(null);
  const renderTokenRef = useRef(0);
  const diagramId = useMemo(() => `fliipa-mmd-${hashDiagramCode(code)}`, [code]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const cached = mermaidSvgCache.get(code);
    if (host && cached) host.innerHTML = cached;
  }, [code]);

  useEffect(() => {
    ensureMermaid();
    const host = hostRef.current;
    if (!host || !code.trim()) return;

    const cached = mermaidSvgCache.get(code);
    if (cached) {
      host.innerHTML = cached;
      return;
    }

    const token = ++renderTokenRef.current;
    let cancelled = false;
    (async () => {
      try {
        const { svg } = await mermaid.render(`${diagramId}-r${token}`, code);
        mermaidSvgCache.set(code, svg);
        if (!cancelled && hostRef.current && renderTokenRef.current === token) {
          hostRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled && hostRef.current && renderTokenRef.current === token) {
          hostRef.current.textContent = err?.message || "No se pudo renderizar el diagrama Mermaid.";
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, diagramId]);

  return (
    <div
      ref={hostRef}
      className="fliipa-mermaid-block"
      style={{
        margin: 0,
        padding: 12,
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        overflowX: "auto",
        minHeight,
        ...style,
      }}
    />
  );
});
