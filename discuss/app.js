const AGENTS = ["chatgpt", "gemini", "grok"];
const ORDER = ["chatgpt", "gemini", "grok"];
const feed = document.getElementById("feed");
const statusEl = document.getElementById("status");
const goBtn = document.getElementById("go");
const stopBtn = document.getElementById("stop");

let abort = null;

const DEFAULTS = {
  chatgpt: { model: "gpt-4o-mini", base: "https://api.openai.com/v1" },
  gemini: { model: "gemini-2.0-flash", base: "" },
  grok: { model: "grok-3-mini", base: "https://api.x.ai/v1" },
};

function $(id) {
  return document.getElementById(id);
}

function connectors() {
  const out = {};
  for (const agent of AGENTS) {
    out[agent] = {
      key: $(`key-${agent}`).value.trim(),
      model: $(`model-${agent}`).value.trim() || DEFAULTS[agent].model,
      base: ($(`base-${agent}`) && $(`base-${agent}`).value.trim()) || DEFAULTS[agent].base,
    };
  }
  return out;
}

function saveConnectors() {
  const snap = {};
  for (const agent of AGENTS) {
    snap[agent] = {
      model: $(`model-${agent}`).value,
      base: $(`base-${agent}`) ? $(`base-${agent}`).value : "",
    };
  }
  try {
    sessionStorage.setItem("echomind-discuss", JSON.stringify(snap));
  } catch (_) {}
}

function restoreConnectors() {
  try {
    const snap = JSON.parse(sessionStorage.getItem("echomind-discuss") || "null");
    if (!snap) return;
    for (const agent of AGENTS) {
      if (snap[agent]?.model) $(`model-${agent}`).value = snap[agent].model;
      if (snap[agent]?.base && $(`base-${agent}`)) $(`base-${agent}`).value = snap[agent].base;
    }
  } catch (_) {}
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

function persona(agent) {
  const shared =
    "You are one voice in a three-AI discussion (ChatGPT, Gemini, Grok). " +
    "Read the full transcript. Add a distinct next turn: build on, challenge, or refine the last speaker. " +
    "Stay on the user's topic. Be concise (about 120–180 words). Do not impersonate the others.";
  if (agent === "chatgpt") return shared + " You are ChatGPT: structured, precise, name assumptions and trade-offs.";
  if (agent === "gemini") return shared + " You are Gemini: synthesize what was said, add overlooked angles, stay practical.";
  return shared + " You are Grok: direct, skeptical of fluff, look for the sharpest useful take.";
}

function asOpenAIMessages(history) {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.role === "user" ? m.content : `[${m.agent}] ${m.content}`,
  }));
}

function corsHint(agent, err) {
  const msg = String(err && err.message ? err.message : err);
  if (/failed to fetch|networkerror|cors|blocked/i.test(msg)) {
    return (
      `${agent} was blocked by the browser (CORS). Official OpenAI/xAI endpoints often refuse GitHub Pages. ` +
      `Use an OpenRouter key with base https://openrouter.ai/api/v1 ` +
      `(models openai/gpt-4o-mini and x-ai/grok-3-mini). Gemini usually works directly.`
    );
  }
  return msg;
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      (data && data.error && (data.error.message || data.error.status || data.error)) ||
      text.slice(0, 400) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

async function openaiCompatible(base, key, model, system, history) {
  const root = String(base || "").replace(/\/$/, "");
  const data = await postJson(
    `${root}/chat/completions`,
    {
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": location.href,
      "X-Title": "EchoMind discuss",
    },
    {
      model,
      temperature: 0.7,
      messages: [{ role: "system", content: system }, ...asOpenAIMessages(history)],
    }
  );
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error("Empty model response");
  return String(content).trim();
}

async function callGemini(key, model, system, history) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(key)}`;
  const contents = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.role === "user" ? m.content : `${m.agent}: ${m.content}` }],
  }));
  const data = await postJson(url, {}, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7 },
  });
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const content = parts.map((p) => p.text || "").join("").trim();
  if (!content) throw new Error("Empty Gemini response");
  return content;
}

async function speak(agent, cfg, history) {
  if (!cfg.key) throw new Error(`No API key for ${agent}.`);
  const system = persona(agent);
  if (agent === "gemini") return callGemini(cfg.key, cfg.model, system, history);
  return openaiCompatible(cfg.base, cfg.key, cfg.model, system, history);
}

async function runLoop({ topic, rounds, connectors: cfg, signal, onTurn }) {
  const history = [{ role: "user", agent: "user", content: topic }];
  const total = Math.max(1, Math.min(8, rounds)) * ORDER.length;
  await onTurn({ type: "start", topic, total });
  for (let i = 0; i < total; i += 1) {
    if (signal && signal.aborted) throw new DOMException("Stopped", "AbortError");
    const agent = ORDER[i % ORDER.length];
    await onTurn({ type: "thinking", agent, index: i + 1, total });
    try {
      const content = await speak(agent, cfg[agent], history);
      history.push({ role: "assistant", agent, content });
      await onTurn({ type: "turn", agent, content, index: i + 1, total });
    } catch (err) {
      throw new Error(corsHint(agent, err));
    }
  }
  await onTurn({ type: "done", turns: history.length - 1 });
}

async function startDiscussion(ev) {
  ev.preventDefault();
  const topic = $("topic").value.trim();
  const rounds = Number($("rounds").value || 2);
  if (!topic) return;
  saveConnectors();

  if (abort) abort.abort();
  abort = new AbortController();
  feed.innerHTML = "";
  addCard("user", topic, false);
  goBtn.disabled = true;
  stopBtn.hidden = false;
  setStatus("Starting…");

  let pending = null;
  try {
    await runLoop({
      topic,
      rounds,
      connectors: connectors(),
      signal: abort.signal,
      onTurn: async (evn) => {
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
        if (evn.type === "done") setStatus(`Done. ${evn.turns} agent turns.`);
      },
    });
  } catch (err) {
    if (err.name !== "AbortError") setStatus(err.message || String(err));
    else setStatus("Stopped.");
  } finally {
    goBtn.disabled = false;
    stopBtn.hidden = true;
    abort = null;
  }
}

$("start").addEventListener("submit", startDiscussion);
stopBtn.addEventListener("click", () => abort && abort.abort());
restoreConnectors();
setStatus("Browser mode — paste keys, then start. Nothing is stored on GitHub.");
