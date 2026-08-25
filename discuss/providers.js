/**
 * Thin HTTP clients for OpenAI, Gemini, and xAI (Grok).
 * Keys are never logged. Empty key → clear error so the UI can show it.
 */

const DEFAULTS = {
  chatgpt: { model: process.env.OPENAI_MODEL || "gpt-4o-mini" },
  gemini: { model: process.env.GEMINI_MODEL || "gemini-2.0-flash" },
  grok: { model: process.env.XAI_MODEL || "grok-3-mini" },
};

function envKey(agent) {
  if (agent === "chatgpt") return process.env.OPENAI_API_KEY || "";
  if (agent === "gemini") return process.env.GEMINI_API_KEY || "";
  if (agent === "grok") return process.env.XAI_API_KEY || "";
  return "";
}

function asMessages(history) {
  return history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    name: m.agent || undefined,
    content: m.agent && m.role !== "user" ? `[${m.agent}] ${m.content}` : m.content,
  }));
}

function transcript(history) {
  return history
    .map((m) => {
      const who = m.role === "user" ? "User" : m.agent;
      return `${who}: ${m.content}`;
    })
    .join("\n\n");
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
      data?.error?.message ||
      data?.error?.status ||
      data?.error ||
      text.slice(0, 400) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

async function openaiCompatible(url, key, model, system, history) {
  const data = await postJson(
    url,
    { Authorization: `Bearer ${key}` },
    {
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        ...asMessages(history).map(({ role, content }) => ({ role, content })),
      ],
    }
  );
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return String(content).trim();
}

async function callGemini(key, model, system, history) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const contents = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.role === "user" ? m.content : `${m.agent}: ${m.content}` }],
  }));
  const data = await postJson(url, {}, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7 },
  });
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts.map((p) => p.text || "").join("").trim();
  if (!content) throw new Error("Empty Gemini response");
  return content;
}

function persona(agent) {
  const shared =
    "You are one voice in a three-AI discussion (ChatGPT, Gemini, Grok). " +
    "Read the full transcript. Add a distinct next turn: build on, challenge, or refine the last speaker. " +
    "Stay on the user's topic. Be concise (about 120–180 words). Do not impersonate the others.";
  if (agent === "chatgpt") {
    return shared + " You are ChatGPT: structured, precise, name assumptions and trade-offs.";
  }
  if (agent === "gemini") {
    return shared + " You are Gemini: synthesize what was said, add overlooked angles, stay practical.";
  }
  return shared + " You are Grok: direct, skeptical of fluff, look for the sharpest useful take.";
}

async function speak(agent, connectors, history) {
  const cfg = connectors[agent] || {};
  const key = String(cfg.key || envKey(agent) || "").trim();
  const model = String(cfg.model || DEFAULTS[agent].model).trim();
  if (!key) {
    throw new Error(`No API key for ${agent}. Paste one in Connectors or set the env var.`);
  }
  const system = persona(agent);
  if (agent === "chatgpt") {
    return openaiCompatible("https://api.openai.com/v1/chat/completions", key, model, system, history);
  }
  if (agent === "grok") {
    return openaiCompatible("https://api.x.ai/v1/chat/completions", key, model, system, history);
  }
  if (agent === "gemini") {
    return callGemini(key, model, system, history);
  }
  throw new Error(`Unknown agent: ${agent}`);
}

module.exports = { speak, DEFAULTS, transcript };
