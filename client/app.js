/* Live multi-user lattice. Local WS mesh, or public MQTT when hosted statically. */
const TONES = {
  calm: { valence: 0.2, arousal: 0.15 },
  focus: { valence: 0.35, arousal: 0.55 },
  joy: { valence: 0.85, arousal: 0.7 },
  curiosity: { valence: 0.55, arousal: 0.45 },
  fatigue: { valence: -0.1, arousal: 0.2 },
};

const self = {
  id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
  name: "",
  room: "echo",
  tone: null,
};
const peers = new Map();
let hops = 0;
let lastFlash = null;
let transport = null;

const canvas = document.getElementById("lattice");
const ctx = canvas.getContext("2d");
const feed = document.getElementById("feed");
const statusEl = document.getElementById("status");

function slug(value) {
  return String(value || "echo").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "echo";
}

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = "hint " + (ok === true ? "ok" : ok === false ? "bad" : "");
}

function logLine(text) {
  const li = document.createElement("li");
  li.textContent = text;
  feed.prepend(li);
  while (feed.children.length > 12) feed.removeChild(feed.lastChild);
}

function roster() {
  const list = [{ id: self.id, name: self.name || "you", tone: self.tone, self: true }];
  for (const peer of peers.values()) list.push(peer);
  return list;
}

function meanSync() {
  const list = roster().filter((n) => n.tone && TONES[n.tone]);
  if (list.length < 2) return 0;
  const mean = list.reduce((s, n) => s + TONES[n.tone].valence, 0) / list.length;
  const drift = list.reduce((s, n) => s + Math.abs(TONES[n.tone].valence - mean), 0) / list.length;
  return Math.max(0, 1 - drift);
}

function point(index, total) {
  const w = canvas.width;
  const h = canvas.height;
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  return {
    x: w / 2 + Math.cos(angle) * Math.min(w, h) * 0.32,
    y: h / 2 + Math.sin(angle) * Math.min(w, h) * 0.32,
  };
}

function draw() {
  const nodes = roster();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#2a2740";
  ctx.lineWidth = 1;
  const pts = nodes.map((_, i) => point(i, nodes.length));
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }
  }
  if (lastFlash && nodes.length >= 2) {
    const a = pts[0];
    const b = pts[Math.min(1, pts.length - 1)];
    ctx.strokeStyle = "#8b7cff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  nodes.forEach((node, i) => {
    const p = pts[i];
    ctx.fillStyle = node.self ? "#e8e4f5" : "#8b7cff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8e4f5";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(node.name, p.x, p.y + 26);
  });
  document.getElementById("peerCount").textContent = String(nodes.length);
  document.getElementById("sync").textContent = meanSync().toFixed(2);
  document.getElementById("hops").textContent = String(hops);
}

function applyRoster(list) {
  peers.clear();
  for (const item of list || []) {
    if (!item || item.id === self.id) continue;
    peers.set(item.id, { id: item.id, name: item.name, tone: item.tone || null });
  }
  draw();
}

function onFrame(msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "join" || msg.type === "leave" || msg.type === "pong") {
    if (Array.isArray(msg.peers)) applyRoster(msg.peers);
    else if (msg.type === "join" && msg.id !== self.id) {
      peers.set(msg.id, { id: msg.id, name: msg.name, tone: null });
    } else if (msg.type === "leave") {
      peers.delete(msg.id);
    }
    if (msg.type === "join" && msg.id !== self.id) logLine(`${msg.name} joined`);
    if (msg.type === "leave") logLine(`${msg.name || msg.id} left`);
    draw();
    return;
  }
  if (msg.type === "presence" && msg.id !== self.id) {
    if (msg.online === false) peers.delete(msg.id);
    else peers.set(msg.id, { id: msg.id, name: msg.name, tone: msg.tone || null });
    draw();
    return;
  }
  if (msg.type === "thought") {
    hops += 1;
    lastFlash = { from: msg.id };
    if (msg.id !== self.id) {
      peers.set(msg.id, { id: msg.id, name: msg.name, tone: msg.tone });
    }
    logLine(`${msg.name}: ${msg.tone}${msg.note ? " — " + msg.note : ""}`);
    draw();
  }
}

function localWsUrl() {
  const q = new URLSearchParams(location.search).get("ws");
  if (q) return q;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/mesh`;
  }
  return null;
}

function connectLocal(url) {
  return new Promise((resolve, reject) => {
    const sock = new WebSocket(url);
    sock.addEventListener("open", () => {
      transport = {
        kind: "ws",
        send(frame) {
          sock.send(JSON.stringify(frame));
        },
        close() {
          sock.close();
        },
      };
      sock.addEventListener("message", (ev) => {
        try { onFrame(JSON.parse(ev.data)); } catch { /* ignore */ }
      });
      resolve();
    });
    sock.addEventListener("error", () => reject(new Error("ws failed")));
  });
}

function connectMqtt() {
  return new Promise((resolve, reject) => {
    if (typeof mqtt === "undefined") {
      reject(new Error("mqtt library missing"));
      return;
    }
    const room = slug(self.room);
    const base = `echomind/v1/${room}`;
    const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt", {
      clientId: "echo-" + self.id.slice(0, 18),
      clean: true,
      keepalive: 30,
      reconnectPeriod: 2000,
    });
    client.on("error", (err) => reject(err));
    client.on("connect", () => {
      client.subscribe([`${base}/thought`, `${base}/presence/+`], { qos: 0 }, (err) => {
        if (err) return reject(err);
        transport = {
          kind: "mqtt",
          send(frame) {
            if (frame.type === "thought") {
              client.publish(`${base}/thought`, JSON.stringify(frame), { qos: 0 });
            }
            if (frame.type === "join" || frame.type === "ping") {
              client.publish(`${base}/presence/${self.id}`, JSON.stringify({
                type: "presence",
                id: self.id,
                name: self.name,
                tone: self.tone,
                online: true,
              }), { qos: 0, retain: true });
            }
            if (frame.type === "leave") {
              client.publish(`${base}/presence/${self.id}`, JSON.stringify({
                type: "presence",
                id: self.id,
                online: false,
              }), { qos: 0, retain: true });
            }
          },
          close() {
            transport.send({ type: "leave", id: self.id });
            client.end();
          },
        };
        resolve();
      });
    });
    client.on("message", (_topic, payload) => {
      try { onFrame(JSON.parse(payload.toString())); } catch { /* ignore */ }
    });
  });
}

async function joinMesh(name, room) {
  self.name = name;
  self.room = slug(room);
  if (transport) {
    try { transport.close(); } catch { /* ignore */ }
    transport = null;
  }
  peers.clear();
  setStatus("Connecting…");
  const local = localWsUrl();
  try {
    if (local) await connectLocal(local);
    else await connectMqtt();
  } catch {
    await connectMqtt();
  }
  transport.send({ type: "join", id: self.id, name: self.name, room: self.room });
  document.getElementById("compose").hidden = false;
  setStatus(`Live as ${self.name} in #${self.room} (${transport.kind})`, true);
  logLine(`you joined #${self.room}`);
  draw();
}

document.getElementById("join").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const name = document.getElementById("name").value.trim();
  const room = document.getElementById("room").value.trim() || "echo";
  if (!name) return;
  joinMesh(name, room).catch((err) => setStatus(err.message || "join failed", false));
});

document.getElementById("compose").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!transport) return;
  const tone = document.getElementById("tone").value;
  const note = document.getElementById("note").value.trim();
  self.tone = tone;
  hops += 1;
  transport.send({
    type: "thought",
    id: self.id,
    name: self.name,
    room: self.room,
    tone,
    note,
  });
  document.getElementById("note").value = "";
  logLine(`you: ${tone}${note ? " — " + note : ""}`);
  draw();
});

window.addEventListener("pagehide", () => {
  if (transport) transport.send({ type: "leave", id: self.id, name: self.name, room: self.room });
});

draw();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
