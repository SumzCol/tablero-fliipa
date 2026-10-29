#!/usr/bin/env node
/**
 * Smoke test contra Cloud Run STG.
 * Uso: node scripts/smoke-gcp-dev.mjs [baseUrl]
 * Lee BOARD_WRITE_KEY de .env.gcp.local si existe.
 */
import fs from "node:fs";

const base = (process.argv[2] || process.env.KANBAN_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Pasa la URL base, ej. https://….run.app/board");
  process.exit(1);
}

let writeKey = process.env.BOARD_WRITE_KEY || "";
if (!writeKey && fs.existsSync(".env.gcp.local")) {
  for (const line of fs.readFileSync(".env.gcp.local", "utf8").split("\n")) {
    const m = line.match(/^BOARD_WRITE_KEY=(.+)$/);
    if (m) writeKey = m[1].trim();
  }
}

const api = `${base}/api/board`;
const probe = await fetch(`${api}?probe=1`, { headers: { Accept: "application/json" } });
const probeJson = await probe.json();
console.log("probe", probe.status, probeJson);

const boardRes = await fetch(api, { headers: { Accept: "application/json" } });
const board = await boardRes.json();
if (board.error) {
  console.error("GET board FAIL", board.error);
  process.exit(1);
}
const tasks = JSON.parse(board["fliipa-kanban:tasks"] || "[]");
const members = JSON.parse(board["fliipa-kanban:members"] || "[]");
console.log("GET board", boardRes.status, `${tasks.length} tareas`, `${members.length} miembros`);

const noKey = await fetch(api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" });
console.log("PUT sin clave", noKey.status, noKey.status === 401 ? "ok" : "FAIL");

const headers = { "Content-Type": "application/json", Accept: "application/json" };
if (writeKey) headers["X-Fliipa-Board-Key"] = writeKey;
const withKey = await fetch(api, { method: "PUT", headers, body: JSON.stringify({ _smoke: Date.now() }) });
console.log("PUT con clave", withKey.status, withKey.ok ? "ok" : "FAIL");

if (!probe.ok || !boardRes.ok || noKey.status !== 401 || !withKey.ok) process.exit(1);
