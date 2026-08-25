# EchoMind live client

Join with a name, share a room, send thought tones. Peers sync in real time.

## How it connects

- On `localhost` (via `node live/server.js`) it uses the local WebSocket mesh at `/mesh`.
- On GitHub Pages it uses MQTT over WebSocket to the public HiveMQ broker, namespaced as `echomind/v1/{room}/…` so phones can meet without our own host.
- Override the socket with `?ws=wss://your-host/mesh`.

## Local

```bash
node live/server.js
# http://localhost:8788
```

Open that URL on two browsers, join the same room, send a tone.

## Live preview

https://htmlpreview.github.io/?https://github.com/rafirafi1111111-bot/EchoMind/blob/gh-pages/index.html
