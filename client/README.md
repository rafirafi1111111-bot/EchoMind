# EchoMind web preview (Phase 3–4)

Static PWA client. No build step, no npm.

## Live

https://rafirafi1111111-bot.github.io/EchoMind/

Published from `client/` by `.github/workflows/deploy-pages.yml` on every push that touches this folder.

## Local

```bash
python3 -m http.server 8080 --directory client
```

Open the URL on a phone and use *Add to Home Screen* for the standalone shell.

This preview animates a four-node lattice in the browser. Later phases can point `app.js` at the Phase 1 HTTP API or a WebSocket bridge.
