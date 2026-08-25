/**
 * Sequential discussion loop: User → ChatGPT → Gemini → Grok → ChatGPT …
 *
 *   node loop.js "Should we ship weekly or monthly?"
 *   echo "topic" | node loop.js
 *
 * Keys: OPENAI_API_KEY, GEMINI_API_KEY, XAI_API_KEY (or --keys via server UI).
 */

const readline = require("readline");
const { speak } = require("./providers");

const ORDER = ["chatgpt", "gemini", "grok"];

async function runLoop({ topic, rounds = 2, connectors = {}, onTurn }) {
  const history = [{ role: "user", agent: "user", content: String(topic).trim() }];
  if (onTurn) await onTurn({ type: "start", topic: history[0].content, order: ORDER, rounds });

  const total = Math.max(1, Math.min(8, Number(rounds) || 2)) * ORDER.length;
  for (let i = 0; i < total; i += 1) {
    const agent = ORDER[i % ORDER.length];
    if (onTurn) await onTurn({ type: "thinking", agent, index: i + 1, total });
    const content = await speak(agent, connectors, history);
    const turn = { role: "assistant", agent, content };
    history.push(turn);
    if (onTurn) await onTurn({ type: "turn", agent, content, index: i + 1, total });
  }

  if (onTurn) await onTurn({ type: "done", turns: history.length - 1 });
  return history;
}

async function readStdinTopic() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function promptTopic() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const topic = await new Promise((resolve) => rl.question("Topic / problem: ", resolve));
  rl.close();
  return topic.trim();
}

async function main() {
  let topic = process.argv.slice(2).join(" ").trim();
  if (!topic && !process.stdin.isTTY) topic = await readStdinTopic();
  if (!topic && process.stdin.isTTY) topic = await promptTopic();
  if (!topic) {
    console.error("Pass a topic: node loop.js \"your problem\"");
    process.exit(1);
  }
  const rounds = Number(process.env.ROUNDS || 2);
  process.stdout.write(`\nEchoMind discuss — ${rounds} round(s)\nTopic: ${topic}\n\n`);
  await runLoop({
    topic,
    rounds,
    onTurn: async (ev) => {
      if (ev.type === "thinking") process.stdout.write(`… ${ev.agent} thinking (${ev.index}/${ev.total})\n`);
      if (ev.type === "turn") process.stdout.write(`\n[${ev.agent}]\n${ev.content}\n\n`);
      if (ev.type === "done") process.stdout.write(`Done. ${ev.turns} agent turns.\n`);
    },
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { runLoop, ORDER };
