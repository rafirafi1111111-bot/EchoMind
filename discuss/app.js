const AGENTS = ["chatgpt", "gemini", "grok"];
const feed = document.getElementById("feed");
const statusEl = document.getElementById("status");
const goBtn = document.getElementById("go");
const stopBtn = document.getElementById("stop");

let abort = null;

function connectors() {
  const out = {};
  for (const agent of AGENTS) {
    out[agent] = {
      key: document.getElementById(`key-${agent}`).value.trim(),
      model: document.getElementById(`model-${agent}`).value.trim(),
    };
  }
  return out;
}

function addCard(agent, text, pending) {
  const li = document.createElement("li");
  li.className = `card ${agent}${pending ? " pending" : ""}`;
  li.dataset.agent = agent;
  const label = agent === "user" ? "You" : agent;
  li.innerHTML = `<header><span>${label}</span><span></span></header><div class="body"></div>`;
  li.querySelector(".body").textContent = text;
  feed.appendChild(li);
  li.scrollIntoView({ behavior: "smooth", block: "end" });
  return li;
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function loadHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    for (const agent of AGENTS) {
      const model = data.models?.[agent]?.model;
      if (model) document.getElementById(`model-${agent}`).value = model;
      const el = document.getElementById(`env-${agent}`);
      el.textContent = data.keysFromEnv?.[agent] ? "Server env key available" : "No server env key";
    }
  } catch {
    setStatus("Backend not reachable. Start with: node server.js");
  }
}

async function startDiscussion(ev) {
  ev.preventDefault();
  const topic = document.getElementById("topic").value.trim();
  const rounds = Number(document.getElementById("rounds").value || 2);
  if (!topic) return;

  if (abort) abort.abort();
  abort = new AbortController();
  feed.innerHTML = "";
  addCard("user", topic, false);
  goBtn.disabled = true;
  stopBtn.hidden = false;
  setStatus("Starting…");

  try {
    const res = await fetch("/api/discuss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, rounds, connectors: connectors() }),
      signal: abort.signal,
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "request failed");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let pending = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const block of parts) {
        const line = block.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const evn = JSON.parse(line.slice(6));
        if (evn.type === "thinking") {
          setStatus(`${evn.agent} thinking (${evn.index}/${evn.total})`);
          pending = addCard(evn.agent, "thinking…", true);
        }
        if (evn.type === "turn") {
          if (pending && pending.dataset.agent === evn.agent) {
            pending.classList.remove("pending");
            pending.querySelector(".body").textContent = evn.content;
            pending = null;
          } else {
            addCard(evn.agent, evn.content, false);
          }
          setStatus(`${evn.agent} finished (${evn.index}/${evn.total})`);
        }
        if (evn.type === "error") setStatus(evn.message);
        if (evn.type === "done") setStatus(`Done. ${evn.turns} agent turns.`);
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") setStatus(err.message || String(err));
    else setStatus("Stopped.");
  } finally {
    goBtn.disabled = false;
    stopBtn.hidden = true;
    abort = null;
  }
}

document.getElementById("start").addEventListener("submit", startDiscussion);
stopBtn.addEventListener("click", () => abort && abort.abort());
loadHealth();
