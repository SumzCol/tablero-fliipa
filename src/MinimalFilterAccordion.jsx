import { useMemo, useState } from "react";
import {
  MINIMAL_ASSIGNEE_UNASSIGNED,
  MINIMAL_FILTER_PROPERTIES,
  appendToFilterGroup,
  collectFilterRules,
  createFilterGroup,
  createFilterRule,
  describeFilterRoot,
  describeFilterRule,
  filterRootIsEmpty,
  patchFilterGroup,
  patchFilterRule,
  removeFilterNode,
} from "./minimalFilters";

function fieldStyle(C, active) {
  return {
    background: C.surfaceRaised,
    border: `1px solid ${active ? C.accent : C.border}`,
    color: C.text,
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13,
    outline: "none",
  };
}

function RuleEditor({ C, rule, statusOptions, assigneeOptions, onPatch, onRemove }) {
  const propertyDef =
    MINIMAL_FILTER_PROPERTIES.find((p) => p.id === rule.property) || MINIMAL_FILTER_PROPERTIES[0];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "8px 10px",
        background: C.surfaceRaised,
        borderRadius: 8,
        border: `1px solid ${C.borderSoft}`,
      }}
    >
      <select
        value={rule.property}
        onChange={(e) => onPatch({ property: e.target.value, value: "" })}
        aria-label="Propiedad"
        style={{ ...fieldStyle(C, false), minWidth: 120 }}
      >
        {MINIMAL_FILTER_PROPERTIES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      {propertyDef.input === "text" && (
        <input
          value={rule.value}
          onChange={(e) => onPatch({ value: e.target.value })}
          placeholder="Contiene…"
          style={{ ...fieldStyle(C, !!rule.value.trim()), flex: "1 1 140px", minWidth: 120 }}
        />
      )}
      {propertyDef.input === "status" && (
        <select
          value={rule.value}
          onChange={(e) => onPatch({ value: e.target.value })}
          style={{ ...fieldStyle(C, !!rule.value), flex: "1 1 160px", minWidth: 140 }}
        >
          <option value="">Estado…</option>
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}
      {propertyDef.input === "assignee" && (
        <select
          value={rule.value}
          onChange={(e) => onPatch({ value: e.target.value })}
          style={{ ...fieldStyle(C, !!rule.value), flex: "1 1 160px", minWidth: 140 }}
        >
          <option value="">Responsable…</option>
          <option value={MINIMAL_ASSIGNEE_UNASSIGNED}>Sin asignar</option>
          {assigneeOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar condición"
        style={{
          background: "none",
          border: "none",
          color: C.textMuted,
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: "2px 6px",
        }}
      >
        ×
      </button>
    </div>
  );
}

function GroupEditor({ C, group, root, onRootChange, statusOptions, assigneeOptions, ctx, depth = 0 }) {
  function updateRoot(next) {
    onRootChange(next);
  }

  function addRule() {
    updateRoot(appendToFilterGroup(root, group.id, createFilterRule("title", "")));
  }

  function addSubgroup() {
    updateRoot(appendToFilterGroup(root, group.id, createFilterGroup("and")));
  }

  return (
    <div
      style={{
        marginLeft: depth ? 10 : 0,
        paddingLeft: depth ? 12 : 0,
        borderLeft: depth ? `2px solid ${C.borderSoft}` : "none",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {depth > 0 && (
          <button
            type="button"
            onClick={() => {
              const next = removeFilterNode(root, group.id);
              onRootChange(next && !filterRootIsEmpty(next) ? next : null);
            }}
            style={{
              background: "none",
              border: "none",
              color: C.textFaint,
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Quitar grupo
          </button>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>Mostrar tareas que cumplen</span>
        <select
          value={group.combinator}
          onChange={(e) =>
            updateRoot(patchFilterGroup(root, group.id, { combinator: e.target.value }))
          }
          style={{ ...fieldStyle(C, true), fontWeight: 600 }}
        >
          <option value="and">todas (Y)</option>
          <option value="or">cualquiera (O)</option>
        </select>
        <span style={{ fontSize: 12, color: C.textFaint }}>de las condiciones siguientes</span>
      </div>

      {group.children.map((child) =>
        child.type === "rule" ? (
          <RuleEditor
            key={child.id}
            C={C}
            rule={child}
            statusOptions={statusOptions}
            assigneeOptions={assigneeOptions}
            onPatch={(patch) => updateRoot(patchFilterRule(root, child.id, patch))}
            onRemove={() => {
              const next = removeFilterNode(root, child.id);
              updateRoot(next && !filterRootIsEmpty(next) ? next : null);
            }}
          />
        ) : (
          <GroupEditor
            key={child.id}
            C={C}
            group={child}
            root={root}
            onRootChange={onRootChange}
            statusOptions={statusOptions}
            assigneeOptions={assigneeOptions}
            ctx={ctx}
            depth={depth + 1}
          />
        )
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={addRule}
          style={{
            background: C.accentSoft,
            color: C.accent,
            border: `1px solid ${C.accent}`,
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Condición
        </button>
        {depth < 2 && (
          <button
            type="button"
            onClick={addSubgroup}
            style={{
              background: "none",
              color: C.textMuted,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Grupo (Y/O)
          </button>
        )}
      </div>
    </div>
  );
}

export default function MinimalFilterAccordion({
  C,
  root,
  onRootChange,
  statusOptions,
  assigneeOptions,
  onLoadDemoData,
}) {
  const [open, setOpen] = useState(false);

  const statusLabel = (id) => statusOptions.find((s) => s.id === id)?.label || id;
  const assigneeLabel = (value) =>
    value === MINIMAL_ASSIGNEE_UNASSIGNED ? "Sin asignar" : value;
  const ctx = useMemo(() => ({ statusLabel, assigneeLabel }), [statusOptions]);

  const summary = describeFilterRoot(root, ctx);
  const rules = useMemo(() => collectFilterRules(root), [root]);
  const hasFilters = !filterRootIsEmpty(root);

  function ensureRootAndOpen() {
    if (!root) onRootChange(createFilterGroup("and"));
    setOpen(true);
  }

  function clearAll() {
    onRootChange(null);
  }

  return (
    <div
      style={{
        border: `1px solid ${C.borderSoft}`,
        borderRadius: 10,
        background: C.surface,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "10px 12px",
          background: "none",
          border: "none",
          color: C.text,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ color: C.textMuted, fontSize: 12, marginTop: 2, flexShrink: 0 }}>
          {open ? "▾" : "▸"}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: hasFilters ? 6 : 0 }}>
            {summary || "Filtros"}
          </span>
          {hasFilters && (
            <span className="fliipa-pills" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {rules.map((rule) => {
                const chip = describeFilterRule(rule, ctx);
                if (!chip) return null;
                return (
                  <span
                    key={rule.id}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.textMuted,
                      background: C.surfaceRaised,
                      border: `1px solid ${C.border}`,
                      borderRadius: 20,
                      padding: "2px 8px",
                    }}
                  >
                    {chip}
                  </span>
                );
              })}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: "0 12px 12px",
            borderTop: `1px solid ${C.borderSoft}`,
            paddingTop: 12,
          }}
        >
          {root ? (
            <GroupEditor
              C={C}
              group={root}
              root={root}
              onRootChange={onRootChange}
              statusOptions={statusOptions}
              assigneeOptions={assigneeOptions}
              ctx={ctx}
            />
          ) : (
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, lineHeight: 1.45 }}>
              Arma condiciones y grupos con Y/O, como en un tablero de Notion.
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {!root && (
              <button
                type="button"
                onClick={ensureRootAndOpen}
                style={{
                  background: C.accent,
                  color: C.onAccent,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Crear filtro
              </button>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                style={{
                  background: "none",
                  color: C.textMuted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Limpiar todo
              </button>
            )}
            {onLoadDemoData && (
              <button
                type="button"
                onClick={onLoadDemoData}
                style={{
                  background: "none",
                  color: C.accent,
                  border: `1px dashed ${C.accent}`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cargar datos de prueba
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
