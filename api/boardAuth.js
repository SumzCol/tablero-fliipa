import { verifyFirebaseBearer } from "./firebaseAdmin.js";
import {
  isEmailAllowed,
  isBoardAdmin,
  putTouchesAccessControl,
} from "./boardAccess.js";
import { readBoardBlob } from "./boardStore.js";

export function authRequiredForBoard() {
  if ((process.env.BOARD_REQUIRE_AUTH || "").trim() === "1") return true;
  if ((process.env.BOARD_REQUIRE_AUTH || "").trim() === "0") return false;
  return (process.env.BOARD_STORE || "").trim().toLowerCase() === "firestore";
}

function header(req, name) {
  const headers = req.headers || {};
  const value = headers[name] || headers[String(name).toLowerCase()];
  if (value == null || value === "") return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export function writeKeyAllowed(req) {
  const required = process.env.BOARD_WRITE_KEY || "";
  if (!required) return true;
  const got = header(req, "x-fliipa-board-key");
  return got === required;
}

export async function resolveRequestAuth(req, { boardSnapshot } = {}) {
  if (writeKeyAllowed(req)) {
    return { kind: "writeKey", email: null, isAdmin: true };
  }
  if (!authRequiredForBoard()) {
    return { kind: "open", email: null, isAdmin: true };
  }
  try {
    const user = await verifyFirebaseBearer(header(req, "authorization"));
    if (!user) return { kind: "denied", error: "Inicia sesión con Google" };
    const board = boardSnapshot || (await readBoardBlob());
    if (!isEmailAllowed(user.email, board)) {
      return { kind: "denied", error: "Tu cuenta no tiene acceso a este tablero" };
    }
    return {
      kind: "user",
      email: user.email,
      uid: user.uid,
      isAdmin: isBoardAdmin(user.email, board),
    };
  } catch (e) {
    return { kind: "denied", error: e.message || "Token inválido" };
  }
}

export async function assertCanRead(req) {
  const auth = await resolveRequestAuth(req);
  if (auth.kind === "denied") {
    const err = new Error(auth.error || "No autorizado");
    err.status = 401;
    throw err;
  }
  return auth;
}

export async function assertCanWrite(req, incoming) {
  const board = await readBoardBlob();
  const auth = await resolveRequestAuth(req, { boardSnapshot: board });
  if (auth.kind === "denied") {
    const err = new Error(auth.error || "No autorizado");
    err.status = 401;
    throw err;
  }
  if (auth.kind === "writeKey" || auth.kind === "open") return auth;
  if (putTouchesAccessControl(incoming) && !auth.isAdmin) {
    const err = new Error("Solo un admin puede cambiar usuarios o acceso");
    err.status = 403;
    throw err;
  }
  return auth;
}
