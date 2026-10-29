#!/usr/bin/env node
/**
 * Descarga el tablero compartido que usa GitHub Pages (KeyValue + JSONBlob)
 * y escribe exports/board-from-gh-pages.json
 */
import fs from "node:fs";
import path from "node:path";

const KV_APP = "x0as3in0";
const KV_KEY = "fliipa-board";
const POINTER_URL = `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${KV_APP}/${KV_KEY}`;
const SOURCE = "https://sumzcol.github.io/tablero-fliipa/";
const OUT_PATH = path.resolve("exports/board-from-gh-pages.json");

function parseJson(val, fallback) {
  if (val == null || val === "") return fallback;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

const pointerRes = await fetch(POINTER_URL);
if (!pointerRes.ok) throw new Error(`KeyValue falló: ${pointerRes.status}`);
const pointerText = (await pointerRes.text()).trim().replace(/^"|"$/g, "");

const blobRes = await fetch(`https://extendsclass.com/api/json-storage/bin/${pointerText}`, {
  headers: { Accept: "application/json" },
});
if (!blobRes.ok) throw new Error(`JSONBlob falló: ${blobRes.status}`);
const board = await blobRes.json();

const out = {
  exportedAt: new Date().toISOString(),
  source: SOURCE,
  storage: {
    keyValuePointer: pointerText,
    blobUrl: `https://extendsclass.com/api/json-storage/bin/${pointerText}`,
    boardUpdatedAt: board._updatedAt ?? null,
  },
  counts: {
    tasks: parseJson(board["fliipa-kanban:tasks"], []).length,
    members: parseJson(board["fliipa-kanban:members"], []).length,
    initiatives: parseJson(board["fliipa-kanban:initiatives"], []).length,
    deletedTasks: Object.keys(parseJson(board["fliipa-kanban:deleted-tasks"], {})).length,
    deletedMembers: Object.keys(parseJson(board["fliipa-kanban:deleted-members"], {})).length,
    deletedInitiatives: Object.keys(parseJson(board["fliipa-kanban:deleted-initiatives"], {})).length,
    attachmentsInBlob: Object.keys(board).filter((k) => k.startsWith("file:")).length,
  },
  tasks: parseJson(board["fliipa-kanban:tasks"], []),
  members: parseJson(board["fliipa-kanban:members"], []),
  initiatives: parseJson(board["fliipa-kanban:initiatives"], []),
  deleted: {
    tasks: parseJson(board["fliipa-kanban:deleted-tasks"], {}),
    members: parseJson(board["fliipa-kanban:deleted-members"], {}),
    initiatives: parseJson(board["fliipa-kanban:deleted-initiatives"], {}),
  },
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
console.log(`Exportado → ${OUT_PATH}`);
console.log(out.counts);
