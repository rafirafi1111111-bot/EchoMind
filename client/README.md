# EchoMind web preview (Phase 3)

Static PWA client. No build step, no npm.

```bash
# from repo root — any static server works
npx --yes serve client
# or: python3 -m http.server 8080 --directory client
```

Then open the URL on a phone and use *Add to Home Screen* for the standalone shell.

This preview animates a four-node lattice in the browser. It does not call the Node mesh yet; later phases can point `app.js` at the Phase 1 HTTP API or a WebSocket bridge.
