#!/usr/bin/env node
/**
 * Importa exports/board-from-gh-pages.json al store local (SQLite por defecto).
 * Uso: node scripts/import-board-export.mjs [ruta.json]
 */
import fs from "node:fs";
import path from "node:path";
import { writeBoardBlob } from "../api/boardStore.js";

process.env.BOARD_STORE = process.env.BOARD_STORE || "sqlite";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "";

const file = path.resolve(process.argv[2] || "exports/board-from-gh-pages.json");
if (!fs.existsSync(file)) {
  console.error(`No existe ${file}. Corre: node scripts/export-gh-pages-board.mjs`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const blob = {
  "fliipa-kanban:tasks": JSON.stringify(data.tasks || []),
  "fliipa-kanban:members": JSON.stringify(data.members || []),
  "fliipa-kanban:initiatives": JSON.stringify(data.initiatives || []),
  "fliipa-kanban:deleted-tasks": JSON.stringify(data.deleted?.tasks || {}),
  "fliipa-kanban:deleted-members": JSON.stringify(data.deleted?.members || {}),
  "fliipa-kanban:deleted-initiatives": JSON.stringify(data.deleted?.initiatives || {}),
  _updatedAt: Date.now(),
};

await writeBoardBlob(blob);
console.log(`Importado en ${process.env.BOARD_STORE}: ${data.tasks?.length ?? 0} tareas, ${data.members?.length ?? 0} miembros.`);
