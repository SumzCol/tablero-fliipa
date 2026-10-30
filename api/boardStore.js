import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const GIST_ID = process.env.GIST_ID;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const FILE_PATH = process.env.BOARD_FILE || path.resolve("data/board.json");

let gistMemo = { tag: "", data: null };

let firestoreDb = null;
let firestoreDocRef = null;

export function resetBoardStoreCache() {
  gistMemo = { tag: "", data: null };
}

export function resolveBoardStoreKind() {
  const forced = (process.env.BOARD_STORE || "").trim().toLowerCase();
  if (forced === "firestore") return "firestore";
  if (forced === "gist") return "gist";
  if (forced === "sqlite") return "sqlite";
  if (forced === "file") return "file";
  if (GIST_ID && TOKEN) return "gist";
  return "sqlite";
}

function gistHeaders(extra) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "tablero-fliipa",
    ...(extra || {}),
  };
}

async function readGist() {
  const headers = gistHeaders();
  if (gistMemo.tag && gistMemo.data) headers["If-None-Match"] = gistMemo.tag;
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers });
  if (res.status === 304 && gistMemo.data) return gistMemo.data;
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "gist get failed");
    err.status = res.status;
    throw err;
  }
  const gist = await res.json();
  const file = gist.files && (gist.files["board.json"] || Object.values(gist.files)[0]);
  let data = {};
  if (file && file.content) {
    try {
      const parsed = JSON.parse(file.content);
      data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      data = {};
    }
  }
  gistMemo = { tag: res.headers.get("etag") || "", data };
  return data;
}

async function writeGist(data) {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: gistHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      files: {
        "board.json": { content: JSON.stringify(data) },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || "gist put failed");
    err.status = res.status;
    throw err;
  }
  gistMemo = { tag: "", data: null };
}

function readFileBoard() {
  if (!fs.existsSync(FILE_PATH)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE_PATH, "utf8") || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeFileBoard(data) {
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data));
}

async function firestoreDoc() {
  if (firestoreDocRef) return firestoreDocRef;
  const { Firestore } = await import("@google-cloud/firestore");
  const projectId =
    process.env.GCP_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    undefined;
  firestoreDb = new Firestore({ projectId });
  const collection = process.env.FIRESTORE_COLLECTION || "fliipa_kanban";
  const docId = process.env.FIRESTORE_DOC_ID || "shared";
  firestoreDocRef = firestoreDb.collection(collection).doc(docId);
  return firestoreDocRef;
}

async function readFirestoreBoard() {
  const ref = await firestoreDoc();
  const snap = await ref.get();
  if (!snap.exists) return {};
  const raw = snap.get("payloadJson");
  if (typeof raw !== "string" || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeFirestoreBoard(data) {
  const ref = await firestoreDoc();
  await ref.set(
    {
      payloadJson: JSON.stringify(data),
      payloadSha1: createHash("sha1").update(JSON.stringify(data)).digest("hex"),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function readBoardBlob() {
  const kind = resolveBoardStoreKind();
  if (kind === "firestore") return readFirestoreBoard();
  if (kind === "gist") return readGist();
  if (kind === "sqlite") {
    const { readSQLiteBoard } = await import("./sqliteBoard.js");
    return readSQLiteBoard();
  }
  return readFileBoard();
}

export async function writeBoardBlob(data) {
  const kind = resolveBoardStoreKind();
  if (kind === "firestore") return writeFirestoreBoard(data);
  if (kind === "gist") return writeGist(data);
  if (kind === "sqlite") {
    const { writeSQLiteBoard } = await import("./sqliteBoard.js");
    return writeSQLiteBoard(data);
  }
  writeFileBoard(data);
}

export function boardStoreConfigError() {
  const kind = resolveBoardStoreKind();
  if (kind === "gist" && (!GIST_ID || !TOKEN)) {
    return "Falta GIST_ID o GITHUB_TOKEN";
  }
  if (kind === "firestore" && !(process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT)) {
    return "Falta GCP_PROJECT_ID para Firestore";
  }
  return null;
}
