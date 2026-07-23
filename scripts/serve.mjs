#!/usr/bin/env node
/**
 * Zero-dependency local static server for docs/, so the site can be
 * previewed here without any hosting. Not used in production -- GitHub
 * Pages serves docs/ directly.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "docs");
const START_PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const MAX_PORT_ATTEMPTS = 10;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(ROOT, urlPath);

    // guard against path traversal outside docs/
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let st = await stat(filePath).catch(() => null);
    if (st && st.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      st = await stat(filePath).catch(() => null);
    }
    if (!st) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath);
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store", // always fresh while previewing locally
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(`500 Internal Server Error: ${err.message}`);
  }
});

let port = START_PORT;
let attemptsLeft = MAX_PORT_ATTEMPTS;

server.on("listening", () => {
  console.log(`Serving docs/ at http://localhost:${port}/`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    if (attemptsLeft > 0) {
      console.warn(`Port ${port} is already in use (probably another server still running) -- trying ${port + 1}...`);
      port += 1;
      attemptsLeft -= 1;
      server.listen(port);
      return;
    }
    console.error(
      `\nCould not find a free port after ${MAX_PORT_ATTEMPTS} tries (last tried: ${port}).\n` +
      `Something else is already listening on all of them. Either stop that process, or run on a` +
      ` specific free port with:\n\n  PORT=3000 npm run serve\n`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(port);
