# EchoMind discuss

Personal three-agent loop: **User → ChatGPT → Gemini → Grok → ChatGPT**.

## Use it online (no local machine)

The UI is static. GitHub Actions publishes it to Pages on every `main` push that touches `discuss/` or `client/`.

- Pages: [https://rafirafi1111111-bot.github.io/EchoMind/discuss/](https://rafirafi1111111-bot.github.io/EchoMind/discuss/)
- Preview: [htmlpreview · discuss](https://htmlpreview.github.io/?https://github.com/rafirafi1111111-bot/EchoMind/blob/gh-pages/discuss/index.html)

If github.io 404s: **Settings → Pages → Deploy from a branch → `gh-pages` / `/`**. Redeploy: **Actions → Deploy PWA to GitHub Pages → Run workflow**.

Paste API keys in the page. They stay in this browser tab and are sent only to the model APIs you chose — not to GitHub.

OpenAI and xAI often block browser CORS from Pages. If a connector fails, set **API base** to `https://openrouter.ai/api/v1` and models to `openai/gpt-4o-mini` / `x-ai/grok-3-mini`. Gemini usually works with a Google AI Studio key as-is.

## Optional local server / CLI

```bash
cd discuss
node server.js          # http://localhost:8790
node loop.js "topic"    # terminal loop; needs env keys
```
