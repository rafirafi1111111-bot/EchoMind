/**
 * Optional HTTP surface for Phase 1.
 * Zero dependencies — Node built-in http only.
 *
 *   GET  /health
 *   GET  /nodes
 *   POST /nodes            { "name": "Luna" }
 *   POST /handshake        { "aId": "...", "bId": "..." }
 *   POST /thought          { "fromId", "toId?", "tone?", "note?" }
 *   GET  /log
 *
 * Run:  node src/server.js
 */

const http = require("http");
const { ConsciousnessNetwork } = require("./network");
const { ConsciousnessNode } = require("./node");
const { logger } = require("./logger");

const PORT = Number(process.env.PORT || 8787);
const mesh = new ConsciousnessNetwork("phase1-http");

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true, mesh: mesh.name, nodes: mesh.nodes.size });
    }

    if (req.method === "GET" && url.pathname === "/nodes") {
      return send(res, 200, { nodes: mesh.list() });
    }

    if (req.method === "POST" && url.pathname === "/nodes") {
      const body = await readJson(req);
      if (!body.name) return send(res, 400, { error: "name required" });
      const node = new ConsciousnessNode(String(body.name));
      node.connect(mesh);
      return send(res, 201, node.snapshot());
    }

    if (req.method === "POST" && url.pathname === "/handshake") {
      const body = await readJson(req);
      mesh.handshake(body.aId, body.bId);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/thought") {
      const body = await readJson(req);
      const node = mesh.get(body.fromId);
      if (!node) return send(res, 404, { error: "fromId not on mesh" });
      const result = node.sendThought({
        toId: body.toId || null,
        tone: body.tone || "curiosity",
        note: body.note || "",
      });
      return send(res, 200, result);
    }

    if (req.method === "GET" && url.pathname === "/log") {
      return send(res, 200, { log: mesh.log });
    }

    send(res, 404, { error: "unknown route" });
  } catch (err) {
    logger.error("http.error", { message: err.message });
    send(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  logger.info("server.listen", { port: PORT });
});
