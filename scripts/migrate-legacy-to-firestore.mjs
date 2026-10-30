#!/usr/bin/env node
/**
 * 1) Descarga tablero legacy (GH Pages / KeyValue)
 * 2) Borra Firestore shared
 * 3) Importa tareas/iniciativas/papelera
 * 4) Aplica miembros Sumz + mapeo de alias legacy (seed-board-access)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { writeBoardBlob } from "../api/boardStore.js";

process.env.BOARD_STORE = "firestore";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "product-fintech-dev";

const root = path.resolve(import.meta.dirname, "..");
const exportPath = path.join(root, "exports/board-from-gh-pages.json");

console.log("==> Export legacy (GH Pages)");
execSync("node scripts/export-gh-pages-board.mjs", { cwd: root, stdio: "inherit" });

console.log("==> Borrar Firestore");
execSync("node scripts/delete-firestore-board.mjs", { cwd: root, stdio: "inherit" });

const data = JSON.parse(fs.readFileSync(exportPath, "utf8"));
const blob = {
  "fliipa-kanban:tasks": JSON.stringify(data.tasks || []),
  "fliipa-kanban:initiatives": JSON.stringify(data.initiatives || []),
  "fliipa-kanban:deleted-tasks": JSON.stringify(data.deleted?.tasks || {}),
  "fliipa-kanban:deleted-members": JSON.stringify({}),
  "fliipa-kanban:deleted-initiatives": JSON.stringify(data.deleted?.initiatives || {}),
  _updatedAt: Date.now(),
};

console.log("==> Importar blob legacy (sin miembros legacy)");
await writeBoardBlob(blob);

console.log("==> Usuarios Sumz + mapeo alias");
execSync("node scripts/seed-board-access.mjs", { cwd: root, stdio: "inherit" });

console.log("Migración legacy → Firestore completada.");
