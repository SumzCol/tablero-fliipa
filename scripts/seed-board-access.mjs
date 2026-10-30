#!/usr/bin/env node
/**
 * Normaliza miembros Sumz, allowlist, alias legacy y limpieza de ex-miembros en Firestore/SQLite.
 * Uso: node scripts/seed-board-access.mjs
 */
import {
  ACCESS_KEY,
  MEMBERS_KEY,
  SEED_MEMBERS,
  buildAccessPayload,
  normalizeMemberRecord,
} from "../api/boardAccess.js";
import { readBoardBlob, writeBoardBlob } from "../api/boardStore.js";
import { LEGACY_PERSON_LABEL_MAP, REMOVED_PERSON_LABELS } from "../src/shared/lib/memberMaps.ts";

process.env.BOARD_STORE = process.env.BOARD_STORE || "firestore";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || "product-fintech-dev";

const CANONICAL_NAMES = new Set(SEED_MEMBERS.map((m) => m.name));

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

function mapPersonLabel(name) {
  const raw = String(name || "").trim();
  if (!raw) return raw;
  if (CANONICAL_NAMES.has(raw)) return raw;
  if (LEGACY_PERSON_LABEL_MAP[raw]) return LEGACY_PERSON_LABEL_MAP[raw];
  const folded = raw.toLocaleLowerCase("es");
  for (const [legacy, canonical] of Object.entries(LEGACY_PERSON_LABEL_MAP)) {
    if (legacy.toLocaleLowerCase("es") === folded) return canonical;
  }
  return raw;
}

const now = Date.now();
const members = SEED_MEMBERS.map((m) => normalizeMemberRecord({ ...m, updatedAt: now }, now));
const access = buildAccessPayload(members);

function trashEntry(item) {
  return { deletedAt: now, item };
}

function isRemovedPerson(name) {
  const raw = String(name || "").trim();
  return raw && REMOVED_PERSON_LABELS.has(raw);
}

const board = await readBoardBlob();
let tasks = parseJson(board["fliipa-kanban:tasks"], []);
let initiatives = parseJson(board["fliipa-kanban:initiatives"], []);
const deletedTasks = parseJson(board["fliipa-kanban:deleted-tasks"], {});
const deletedInits = parseJson(board["fliipa-kanban:deleted-initiatives"], {});
let taskFixes = 0;
let initFixes = 0;
let tasksRemoved = 0;
let initsRemoved = 0;

const keptTasks = [];
for (const t of tasks) {
  const mapped = mapPersonLabel(t.assignee);
  if (isRemovedPerson(mapped)) {
    deletedTasks[t.id] = trashEntry({ ...t, assignee: mapped, updatedAt: now });
    tasksRemoved += 1;
    continue;
  }
  if (mapped !== t.assignee) {
    t.assignee = mapped;
    t.updatedAt = now;
    taskFixes += 1;
  }
  keptTasks.push(t);
}
tasks = keptTasks;

const keptInits = [];
for (const ini of initiatives) {
  const mapped = mapPersonLabel(ini.owner);
  if (isRemovedPerson(mapped)) {
    deletedInits[ini.id] = trashEntry({ ...ini, owner: mapped, updatedAt: now });
    initsRemoved += 1;
    continue;
  }
  if (mapped !== ini.owner) {
    ini.owner = mapped;
    ini.updatedAt = now;
    initFixes += 1;
  }
  keptInits.push(ini);
}
initiatives = keptInits;

const removedInitIds = new Set(Object.keys(deletedInits));
for (const t of tasks) {
  if (t.initiativeId && removedInitIds.has(t.initiativeId)) {
    t.initiativeId = "";
    t.updatedAt = now;
    taskFixes += 1;
  }
}

const keepIds = new Set(members.map((m) => m.id));
const deleted = parseJson(board["fliipa-kanban:deleted-members"], {});
const oldMembers = parseJson(board[MEMBERS_KEY], []);
for (const om of oldMembers) {
  if (om?.id && !keepIds.has(om.id)) {
    deleted[om.id] = { deletedAt: now, item: om };
  }
}

const leftover = new Set();
for (const t of tasks) {
  const a = String(t.assignee || "").trim();
  if (a && !CANONICAL_NAMES.has(a)) leftover.add(a);
}
for (const ini of initiatives) {
  const o = String(ini.owner || "").trim();
  if (o && !CANONICAL_NAMES.has(o)) leftover.add(o);
}

const out = {
  ...board,
  [MEMBERS_KEY]: JSON.stringify(members),
  [ACCESS_KEY]: JSON.stringify(access),
  "fliipa-kanban:tasks": JSON.stringify(tasks),
  "fliipa-kanban:initiatives": JSON.stringify(initiatives),
  "fliipa-kanban:deleted-tasks": JSON.stringify(deletedTasks),
  "fliipa-kanban:deleted-initiatives": JSON.stringify(deletedInits),
  "fliipa-kanban:deleted-members": JSON.stringify(deleted),
  _updatedAt: now,
};

await writeBoardBlob(out);
console.log(
  "Seed acceso OK:",
  members.length,
  "miembros,",
  access.allowedEmails.join(", "),
  "| alias tareas:",
  taskFixes,
  "iniciativas:",
  initFixes,
  "| papelera ex-miembros: tareas",
  tasksRemoved,
  "iniciativas",
  initsRemoved
);
if (leftover.size) {
  console.warn("Responsables legacy sin mapear (revisar manualmente):", [...leftover].sort().join(", "));
}
