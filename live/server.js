/**
 * Live EchoMind host: serves client/ and a WebSocket mesh.
 *
 *   node live/server.js
 *   open http://localhost:8788
 *
 * Protocol (JSON text frames):
 *   { type:"join", id, name, room }
 *   { type:"leave", id, room }
 *   { type:"thought", id, name, room, tone, note }
 *   { type:"ping", id, room }
 * Server fans out join / leave / thought / roster to everyone in the room.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { upgrade } = require("./ws");

const PORT = Number(process.env.PORT || 8788);
const ROOT = path.join(__dirname, "../client");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const rooms = new Map();

function roomOf(name) {
  const key = String(name || "echo").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "echo";
  if (!rooms.has(key)) rooms.set(key, new Map());
  return { key, members: rooms.get(key) };
}

function roster(members) {
  return [...members.values()].map((m) => ({
    id: m.id,
    name: m.name,
    tone: m.tone || null,
  }));
}

function broadcast(members, frame, exceptId) {
  for (const [id, m] of members) {
    if (id === exceptId) continue;
    m.ws.send(frame);
  }
}

function serve(req, res) {
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

const server = http.createServer(serve);

server.on("upgrade", (req, socket) => {
  if (new URL(req.url, "http://local").pathname !== "/mesh") {
    socket.destroy();
    return;
  }
  const ws = upgrade(req, socket);
  if (!ws) return;

  const state = { id: null, name: null, room: null, tone: null, ws };

  ws.onMessage = (msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "join") {
      const { key, members } = roomOf(msg.room);
      if (state.id && rooms.get(state.room)?.has(state.id)) {
        rooms.get(state.room).delete(state.id);
      }
      state.id = String(msg.id || "").slice(0, 40);
      state.name = String(msg.name || "anon").slice(0, 32);
      state.room = key;
      if (!state.id) return;
      members.set(state.id, state);
      const frame = {
        type: "join",
        id: state.id,
        name: state.name,
        room: key,
        peers: roster(members),
      };
      broadcast(members, frame);
      return;
    }
    if (!state.id) return;
    const pack = rooms.get(state.room);
    if (!pack) return;
    if (msg.type === "thought") {
      state.tone = String(msg.tone || "curiosity").slice(0, 24);
      broadcast(pack, {
        type: "thought",
        id: state.id,
        name: state.name,
        room: state.room,
        tone: state.tone,
        note: String(msg.note || "").slice(0, 280),
        at: Date.now(),
      });
    }
    if (msg.type === "ping") {
      ws.send({ type: "pong", peers: roster(pack) });
    }
  };

  ws.onClose = () => {
    if (!state.id || !state.room) return;
    const pack = rooms.get(state.room);
    if (!pack) return;
    pack.delete(state.id);
    broadcast(pack, { type: "leave", id: state.id, name: state.name, room: state.room, peers: roster(pack) });
  };
});

server.listen(PORT, () => {
  console.log(`[live] http://localhost:${PORT}  ws://localhost:${PORT}/mesh`);
});
