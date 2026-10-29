import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = process.env.SQLITE_PATH || path.resolve("data/fliipa-kanban.sqlite");
const DOC_ID = process.env.SQLITE_DOC_ID || process.env.FIRESTORE_DOC_ID || "shared";
const LEGACY_FILE = process.env.BOARD_FILE || path.resolve("data/board.json");

/** @type {import("better-sqlite3").Database | null} */
let dbInstance = null;

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kanban_board (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      payload_sha1 TEXT,
      updated_at TEXT NOT NULL
    );
  `);
}

function parsePayload(raw) {
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeRow(db, data) {
  const payloadJson = JSON.stringify(data);
  db.prepare(
    `UPDATE kanban_board
     SET payload_json = ?, payload_sha1 = ?, updated_at = ?
     WHERE id = ?`
  ).run(payloadJson, createHash("sha1").update(payloadJson).digest("hex"), new Date().toISOString(), DOC_ID);
}

function migrateLegacyJsonIfEmpty(db) {
  const row = db.prepare("SELECT payload_json FROM kanban_board WHERE id = ?").get(DOC_ID);
  const current = parsePayload(row?.payload_json);
  if (Object.keys(current).length > 0) return;
  if (!fs.existsSync(LEGACY_FILE)) return;
  try {
    const legacy = parsePayload(fs.readFileSync(LEGACY_FILE, "utf8"));
    if (Object.keys(legacy).length > 0) writeRow(db, legacy);
  } catch {
    /* ignore */
  }
}

function getDb() {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  dbInstance = new Database(DB_PATH);
  ensureSchema(dbInstance);
  const exists = dbInstance.prepare("SELECT 1 AS ok FROM kanban_board WHERE id = ?").get(DOC_ID);
  if (!exists) {
    const empty = "{}";
    dbInstance
      .prepare(
        `INSERT INTO kanban_board (id, payload_json, payload_sha1, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(DOC_ID, empty, createHash("sha1").update(empty).digest("hex"), new Date().toISOString());
  }
  migrateLegacyJsonIfEmpty(dbInstance);
  return dbInstance;
}

export function readSQLiteBoard() {
  const db = getDb();
  const row = db.prepare("SELECT payload_json FROM kanban_board WHERE id = ?").get(DOC_ID);
  return parsePayload(row?.payload_json);
}

export function writeSQLiteBoard(data) {
  writeRow(getDb(), data);
}
