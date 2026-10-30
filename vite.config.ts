import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import planeHandler from "./api/plane.js";
import boardHandler from "./api/board.js";

if (!process.env.BOARD_STORE && !(process.env.GIST_ID && process.env.GITHUB_TOKEN)) {
  process.env.BOARD_STORE = "sqlite";
}

function localBoardApi() {
  return {
    name: "local-board-api",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/board", (req, res) => {
        boardHandler(req, res).catch((err: Error) => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: err?.message || "Error del tablero" }));
          }
        });
      });
    },
  };
}

function planeApiProxy() {
  return {
    name: "plane-api-proxy",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/plane", (req, res) => {
        planeHandler(req, res);
      });
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [react(), localBoardApi(), planeApiProxy()],
});
