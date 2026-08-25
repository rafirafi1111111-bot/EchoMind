/**
 * Personal multi-agent discussion host.
 *
 *   cd discuss && node server.js
 *   open http://localhost:8790
 *
 * POST /api/discuss  { topic, rounds, connectors }  → SSE event stream
 * GET  /api/health
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { runLoop } = require("./loop");
const { DEFAULTS } = require("./providers");

const PORT = Number(process.env.PORT || 8790);
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8") || "{}";
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sanitizeConnectors(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  for (const agent of ["chatgpt", "gemini", "grok"]) {
    const row = src[agent] && typeof src[agent] === "object" ? src[agent] : {};
    out[agent] = {
      key: String(row.key || "").slice(0, 256),
      model: String(row.model || DEFAULTS[agent].model).slice(0, 80),
    };
  }
  return out;
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://local").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      models: DEFAULTS,
      keysFromEnv: {
        chatgpt: Boolean(process.env.OPENAI_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        grok: Boolean(process.env.XAI_API_KEY),
      },
    });
  }

  if (req.method === "POST" && url.pathname === "/api/discuss") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
    const topic = String(body.topic || "").trim();
    if (!topic) return sendJson(res, 400, { error: "topic is required" });
    const rounds = Math.max(1, Math.min(8, Number(body.rounds) || 2));
    const connectors = sanitizeConnectors(body.connectors);

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const emit = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    try {
      await runLoop({
        topic,
        rounds,
        connectors,
        onTurn: async (ev) => {
          if (closed) throw new Error("client closed");
          emit(ev);
        },
      });
    } catch (err) {
      if (!closed) emit({ type: "error", message: err.message || String(err) });
    }
    if (!closed) {
      emit({ type: "end" });
      res.end();
    }
    return;
  }

  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[discuss] http://localhost:${PORT}`);
  console.log(`[discuss] CLI: node loop.js "your topic"`);
});
