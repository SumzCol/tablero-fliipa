import { useEffect, useMemo, useRef, useState } from "react";
import { rowsFromMembers, validateAccessMembers } from "@/shared/lib/accessMembers";

const ACCESS_KEY = "fliipa-kanban:access";

export default function AccessAdminPanel({ C, members, onSave, onClose }) {
  const [rows, setRows] = useState(() => rowsFromMembers(members));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current || busy) return;
    setRows(rowsFromMembers(members));
  }, [members, busy]);

  const allowlistPreview = useMemo(
    () => rows.map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean),
    [rows]
  );

  function updateRow(id, patch) {
    dirtyRef.current = true;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    dirtyRef.current = true;
    const now = Date.now();
    setRows((prev) => [
      ...prev,
      {
        id: `m-new-${now}`,
        name: "",
        email: "",
        role: "member",
        aliases: [],
        aliasesText: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  function removeRow(id) {
    dirtyRef.current = true;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    setError("");
    const result = validateAccessMembers(rows);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBusy(true);
    try {
      await onSave({
        members: result.members,
        access: { allowedEmails: result.allowedEmails, updatedAt: Date.now() },
      });
      dirtyRef.current = false;
      onClose();
    } catch (e) {
      setError(e.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  const input = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: C.text,
    fontSize: 13,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,10,14,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflow: "auto",
          padding: 20,
        }}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Acceso y usuarios (admin)</h2>
        <p style={{ margin: "0 0 16px", color: C.textMuted, fontSize: 13, lineHeight: 1.45 }}>
          Allowlist ({allowlistPreview.length}): solo estos correos pueden entrar. Los alias se usan
          para emparejar responsables en tareas ({ACCESS_KEY} se actualiza al guardar).
        </p>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr 1fr 90px auto",
              gap: 8,
              alignItems: "start",
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: `1px solid ${C.borderSoft}`,
            }}
          >
            <label style={{ fontSize: 12, color: C.textMuted }}>
              Nombre
              <input
                style={{ ...input, marginTop: 4 }}
                value={row.name}
                onChange={(e) => updateRow(row.id, { name: e.target.value })}
              />
            </label>
            <label style={{ fontSize: 12, color: C.textMuted }}>
              Correo Sumz
              <input
                style={{ ...input, marginTop: 4 }}
                value={row.email}
                onChange={(e) => updateRow(row.id, { email: e.target.value })}
                placeholder="nombre@sumz.co"
              />
            </label>
            <label style={{ fontSize: 12, color: C.textMuted }}>
              Alias (coma)
              <input
                style={{ ...input, marginTop: 4 }}
                value={row.aliasesText}
                onChange={(e) => updateRow(row.id, { aliasesText: e.target.value })}
                placeholder="Ale Suárez, …"
              />
            </label>
            <label style={{ fontSize: 12, color: C.textMuted }}>
              Rol
              <select
                style={{ ...input, marginTop: 4 }}
                value={row.role === "admin" ? "admin" : "member"}
                onChange={(e) => updateRow(row.id, { role: e.target.value })}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              style={{
                marginTop: 22,
                background: "none",
                border: `1px solid ${C.danger}`,
                color: C.danger,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Quitar
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" onClick={addRow} style={{ ...input, width: "auto", cursor: "pointer" }}>
            + Persona
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: C.accent,
              color: "#0b0d12",
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Guardando…" : "Guardar acceso"}
          </button>
          <button type="button" onClick={onClose} style={{ ...input, width: "auto", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>
        {error && <p style={{ color: C.danger, marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}
