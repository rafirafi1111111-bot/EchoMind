/* Browser-side lattice mock for the Phase 3 PWA preview. */
const NAMES = ["Luna", "Orion", "Sage", "Nyx"];
const TONES = ["calm", "focus", "joy", "curiosity"];

const nodes = NAMES.map((name, i) => ({
  name,
  angle: (Math.PI * 2 * i) / NAMES.length - Math.PI / 2,
  sync: 0.4,
}));

let tick = 0;
let running = true;
let hops = 0;
let meanSync = 0.4;

const canvas = document.getElementById("lattice");
const ctx = canvas.getContext("2d");
const feed = document.getElementById("feed");

function point(node) {
  const w = canvas.width;
  const h = canvas.height;
  return {
    x: w / 2 + Math.cos(node.angle) * Math.min(w, h) * 0.32,
    y: h / 2 + Math.sin(node.angle) * Math.min(w, h) * 0.32,
  };
}

function draw(flash) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#2a2740";
  ctx.lineWidth = 1;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = point(nodes[i]);
      const b = point(nodes[j]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  if (flash) {
    const a = point(flash.from);
    const b = point(flash.to);
    ctx.strokeStyle = "#8b7cff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const node of nodes) {
    const p = point(node);
    ctx.fillStyle = "#8b7cff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8e4f5";
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(node.name, p.x, p.y + 26);
  }
}

function logLine(text) {
  const li = document.createElement("li");
  li.textContent = text;
  feed.prepend(li);
  while (feed.children.length > 8) feed.removeChild(feed.lastChild);
}

function step() {
  if (!running) return;
  tick += 1;
  const from = nodes[Math.floor(Math.random() * nodes.length)];
  let to = nodes[Math.floor(Math.random() * nodes.length)];
  if (to === from) to = nodes[(nodes.indexOf(from) + 1) % nodes.length];
  const tone = TONES[Math.floor(Math.random() * TONES.length)];
  hops += 1;
  from.sync = Math.min(1, from.sync + 0.04);
  to.sync = Math.min(1, to.sync + 0.03);
  meanSync = nodes.reduce((s, n) => s + n.sync, 0) / nodes.length;

  document.getElementById("tick").textContent = String(tick);
  document.getElementById("sync").textContent = meanSync.toFixed(2);
  document.getElementById("links").textContent = String(hops);
  logLine(`t${tick}  ${from.name} → ${to.name}  ${tone}`);
  draw({ from, to });
}

document.getElementById("toggle").addEventListener("click", (ev) => {
  running = !running;
  ev.target.textContent = running ? "Pause" : "Resume";
});

draw();
setInterval(step, 900);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
