import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import boardHandler from "../api/board.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const port = Number(process.env.PORT || 8080);

function normalizeBase(raw) {
  const value = (raw || "/").trim();
  if (!value || value === "/") return "";
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

const base = normalizeBase(process.env.APP_BASE_PATH || "/");
const apiPath = `${base}/api/board`;

const app = express();
app.disable("x-powered-by");

app.all(apiPath, (req, res) => boardHandler(req, res));

if (base) {
  app.get("/", (_req, res) => res.redirect(302, `${base}/`));
  app.use(base, express.static(distDir, { index: "index.html", maxAge: "1h" }));
  app.get(`${base}/*`, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
} else {
  app.use(express.static(distDir, { index: "index.html", maxAge: "1h" }));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`fliipa-kanban listening on :${port} base=${base || "/"}`);
});
