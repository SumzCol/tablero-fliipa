import { SEED_MEMBERS } from "./seedMembers.js";

export const BOOTSTRAP_ADMIN_EMAIL = "fj.martinez@sumz.co";

export function enforceBootstrapAdminMembers(members) {
  const adminEmail = BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  let hasBootstrapAdmin = false;
  const out = (members || []).map((m) => {
    const email = String(m.email || "")
      .trim()
      .toLowerCase();
    if (email === adminEmail) {
      hasBootstrapAdmin = true;
      return { ...m, email, role: "admin" };
    }
    return { ...m };
  });
  for (const m of out) {
    const email = String(m.email || "").trim().toLowerCase();
    if (email !== adminEmail && m.role === "admin") m.role = "member";
  }
  if (!hasBootstrapAdmin) {
    const seed = SEED_MEMBERS.find((s) => s.email === adminEmail);
    if (seed) out.unshift({ ...seed, createdAt: Date.now(), updatedAt: Date.now() });
  }
  return out;
}

export const ACCESS_KEY = "fliipa-kanban:access";
export const MEMBERS_KEY = "fliipa-kanban:members";

export { SEED_MEMBERS };

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

export function bootstrapAllowlist() {
  const fromEnv = (process.env.BOARD_BOOTSTRAP_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  return SEED_MEMBERS.map((m) => m.email.toLowerCase());
}

export function parseAccessRecord(board) {
  const raw = board && board[ACCESS_KEY];
  const parsed = parseJson(raw, null);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const list = Array.isArray(parsed.allowedEmails) ? parsed.allowedEmails : [];
    return {
      allowedEmails: list.map((e) => String(e).trim().toLowerCase()).filter(Boolean),
    };
  }
  return null;
}

export function parseMembers(board) {
  return parseJson(board?.[MEMBERS_KEY], []);
}

export function allowedEmailsFromBoard(board) {
  const access = parseAccessRecord(board);
  if (access?.allowedEmails?.length) return access.allowedEmails;
  const members = parseMembers(board);
  const fromMembers = members.map((m) => String(m.email || "").trim().toLowerCase()).filter(Boolean);
  if (fromMembers.length) return fromMembers;
  return bootstrapAllowlist();
}

export function isEmailAllowed(email, board) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) return false;
  return allowedEmailsFromBoard(board).includes(norm);
}

export function memberForEmail(email, board) {
  const norm = String(email || "").trim().toLowerCase();
  const members = parseMembers(board);
  return (
    members.find((m) => String(m.email || "").trim().toLowerCase() === norm) ||
    SEED_MEMBERS.find((m) => m.email.toLowerCase() === norm) ||
    null
  );
}

export function isBoardAdmin(email, board) {
  const norm = String(email || "").trim().toLowerCase();
  if (norm === BOOTSTRAP_ADMIN_EMAIL) return true;
  const member = memberForEmail(email, board);
  if (member?.role === "admin") return true;
  const admins = (process.env.BOARD_ADMIN_EMAILS || BOOTSTRAP_ADMIN_EMAIL)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(norm);
}

const ACCESS_MANAGE_KEYS = new Set([ACCESS_KEY, MEMBERS_KEY]);

export function putTouchesAccessControl(incoming) {
  if (!incoming || typeof incoming !== "object") return false;
  return Object.keys(incoming).some((k) => ACCESS_MANAGE_KEYS.has(k));
}

export function normalizeMemberRecord(raw, now = Date.now()) {
  const email = String(raw.email || "").trim().toLowerCase();
  const name = String(raw.name || "").trim();
  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases.map((a) => String(a).trim()).filter(Boolean)
    : [];
  const role = raw.role === "admin" ? "admin" : "member";
  const id =
    raw.id ||
    (email ? `m-${email.split("@")[0].replace(/[^a-z0-9]+/gi, "-")}` : `m-${now}`);
  return {
    id,
    name: name || email.split("@")[0],
    email,
    aliases,
    role,
    createdAt: raw.createdAt || now,
    updatedAt: now,
  };
}

export function buildAccessPayload(members) {
  const allowedEmails = members.map((m) => String(m.email || "").trim().toLowerCase()).filter(Boolean);
  return { allowedEmails, updatedAt: Date.now() };
}
