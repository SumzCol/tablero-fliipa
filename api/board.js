import { createHash } from "node:crypto";
import { assertCanRead, assertCanWrite, writeKeyAllowed } from "./boardAuth.js";
import {
  boardStoreConfigError,
  readBoardBlob,
  resetBoardStoreCache,
  writeBoardBlob,
} from "./boardStore.js";

export function resetBoardCache() {
  resetBoardStoreCache();
}

export function publicBoard(data) {
  const out = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;
  for (const key of Object.keys(data)) {
    if (key.startsWith("file:")) continue;
    out[key] = data[key];
  }
  return out;
}

export function boardEtag(body) {
  return `"${createHash("sha1").update(body).digest("hex")}"`;
}

export function etagMatches(header, etag) {
  if (!header || !etag) return false;
  const expected = String(etag).trim();
  return String(header)
    .split(",")
    .some((part) => part.trim() === expected);
}

function header(req, name) {
  const headers = req.headers || {};
  const value = headers[name] || headers[String(name).toLowerCase()];
  if (value == null || value === "") return "";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function queryOf(req) {
  const fromQuery = req.query && typeof req.query === "object" ? req.query : null;
  if (fromQuery && (fromQuery.probe != null || fromQuery.file != null)) return fromQuery;
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if ([...url.searchParams.keys()].length) return Object.fromEntries(url.searchParams.entries());
  } catch {
    /* sigue con req.query */
  }
  return fromQuery || {};
}

function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, If-None-Match, Authorization, X-Fliipa-Board-Key"
  );
  res.setHeader("Access-Control-Expose-Headers", "ETag");
}

function json(res, status, body, extraHeaders) {
  applyCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string" && req.body) {
    return Promise.resolve(JSON.parse(req.body));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const configError = boardStoreConfigError();
  if (configError) {
    json(res, 500, { error: configError });
    return;
  }

  try {
    if (req.method === "GET") {
      const query = queryOf(req);
      if (query.probe != null && String(query.probe) !== "0") {
        json(res, 200, { ok: true, store: process.env.BOARD_STORE || "auto" });
        return;
      }

      await assertCanRead(req);
      const data = await readBoardBlob();
      if (query.file) {
        const id = String(query.file);
        const file = data[`file:${id}`];
        if (!file || typeof file !== "object") {
          json(res, 404, { error: "No se encontró el archivo" });
          return;
        }
        json(res, 200, file, { "Cache-Control": "private, max-age=86400" });
        return;
      }

      const body = JSON.stringify(publicBoard(data));
      const etag = boardEtag(body);
      applyCors(res);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "private, no-cache");
      res.setHeader("ETag", etag);
      if (etagMatches(header(req, "if-none-match"), etag)) {
        res.statusCode = 304;
        res.end();
        return;
      }
      res.statusCode = 200;
      res.end(body);
      return;
    }

    if (req.method === "PUT") {
      const incoming = await readBody(req);
      try {
        await assertCanWrite(req, incoming);
      } catch (e) {
        json(res, e.status || 401, { error: e.message || "No autorizado" });
        return;
      }
      const current = await readBoardBlob();
      const merged = {
        ...(current && typeof current === "object" ? current : {}),
        ...(incoming && typeof incoming === "object" ? incoming : {}),
        _updatedAt: Date.now(),
      };
      await writeBoardBlob(merged);
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: "Método no permitido" });
  } catch (e) {
    json(res, e.status || 500, { error: e.message || "Error del tablero" });
  }
}
