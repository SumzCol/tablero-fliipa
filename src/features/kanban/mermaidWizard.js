function lines(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function slugId(label, index, used) {
  let base =
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `n${index + 1}`;
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}_${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function escapeLabel(label) {
  return label.replace(/"/g, '\\"');
}

/** @param {{ kind: string, title: string, nodesText: string, linksText: string, connectMode: string, seqParticipants: string, seqMessages: string, pieSlices: string }} cfg */
export function buildMermaidFromWizard(cfg) {
  const kind = cfg.kind || "flowchart-lr";

  if (kind === "sequence") {
    const parts = lines(cfg.seqParticipants);
    const messages = lines(cfg.seqMessages);
    if (!parts.length) {
      return "sequenceDiagram\n  participant A as Actor\n  A->>A: Agrega participantes";
    }
    const used = new Set();
    const idByLabel = new Map();
    const decl = parts.map((p, i) => {
      const id = slugId(p, i, used);
      idByLabel.set(p.toLowerCase(), id);
      return `  participant ${id} as ${escapeLabel(p)}`;
    });
    const msgLines = messages.map((line) => {
      const m = line.match(/^(.+?)(-+>>|->>)(.+?):\s*(.+)$/);
      if (!m) return `  Note over ${decl[0]?.split(" ")[1] || "A"}: Formato: Origen->>Destino: mensaje`;
      const from = idByLabel.get(m[1].trim().toLowerCase()) || slugId(m[1], 0, used);
      const arrow = m[2];
      const to = idByLabel.get(m[3].trim().toLowerCase()) || slugId(m[3], 1, used);
      return `  ${from}${arrow}${to}: ${escapeLabel(m[4])}`;
    });
    return ["sequenceDiagram", ...decl, ...msgLines].join("\n");
  }

  if (kind === "pie") {
    const title = (cfg.title || "Distribución").trim();
    const slices = lines(cfg.pieSlices);
    if (!slices.length) {
      return `pie title ${escapeLabel(title)}\n  "A" : 1`;
    }
    const sliceLines = slices.map((row) => {
      const m = row.match(/^(.+?)\s*:\s*(\d+(?:\.\d+)?)$/);
      if (!m) return `  "${escapeLabel(row)}" : 1`;
      return `  "${escapeLabel(m[1].trim())}" : ${m[2]}`;
    });
    return [`pie title ${escapeLabel(title)}`, ...sliceLines].join("\n");
  }

  const direction = kind === "flowchart-tb" ? "TB" : "LR";
  const labels = lines(cfg.nodesText);
  if (!labels.length) {
    return `flowchart ${direction}\n  A[Componente A] --> B[Componente B]`;
  }

  const used = new Set();
  const nodes = labels.map((label, i) => {
    const id = slugId(label, i, used);
    return { id, label };
  });

  const nodeLines = nodes.map((n) => `  ${n.id}["${escapeLabel(n.label)}"]`);
  let edgeLines = [];

  if (cfg.connectMode === "manual") {
    const linkRows = lines(cfg.linksText);
    const byLabel = new Map(nodes.map((n) => [n.label.toLowerCase(), n.id]));
    linkRows.forEach((row) => {
      const m = row.match(/^(.+?)\s*-->\s*(.+)$/);
      if (!m) return;
      const from = byLabel.get(m[1].trim().toLowerCase());
      const to = byLabel.get(m[2].trim().toLowerCase());
      if (from && to) edgeLines.push(`  ${from} --> ${to}`);
    });
  }

  if (!edgeLines.length && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edgeLines.push(`  ${nodes[i].id} --> ${nodes[i + 1].id}`);
    }
  }

  return [`flowchart ${direction}`, ...nodeLines, ...edgeLines].join("\n");
}

export function mermaidMarkdownBlock(source) {
  return `\`\`\`mermaid\n${source.trim()}\n\`\`\``;
}
