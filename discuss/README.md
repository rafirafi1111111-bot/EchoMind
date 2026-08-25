# EchoMind discuss

Personal three-agent loop: **User → ChatGPT → Gemini → Grok → ChatGPT**.

## Run the web UI

```bash
cd discuss
node server.js
# http://localhost:8790
```

Paste API keys in **Connectors**, or export them instead:

```bash
export OPENAI_API_KEY=...
export GEMINI_API_KEY=...
export XAI_API_KEY=...
node server.js
```

Enter a topic, set rounds (each round is all three models once), start. Turns stream live into the page.

## Run from the terminal

```bash
cd discuss
node loop.js "Should we ship weekly or monthly?"
```

`ROUNDS` defaults to 2.

## Files

| Path | Role |
|------|------|
| `index.html` `styles.css` `app.js` | Clean local UI + connector fields |
| `server.js` | Static host + `POST /api/discuss` SSE |
| `loop.js` | Sequential conversation runner + CLI |
| `providers.js` | OpenAI, Gemini, xAI HTTP calls |
