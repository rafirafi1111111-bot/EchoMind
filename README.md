# EchoMind
Human Consciousness Network — 2026

EchoMind transmits **raw emotional resonance and cognitive state** without words. Affect is captured as a bio-semantic waveform, converted into a harmonic frequency packet, and phase-locked across a mesh of consenting minds.

## Live multi-user app

Hardcoded demo nodes are gone. People join with a **name**, share a **room**, and send **thought tones** that other phones see in real time.

**Open now:** [htmlpreview · EchoMind](https://htmlpreview.github.io/?https://github.com/rafirafi1111111-bot/EchoMind/blob/gh-pages/index.html)

**Pages URL (after enable):** [https://rafirafi1111111-bot.github.io/EchoMind/](https://rafirafi1111111-bot.github.io/EchoMind/)

How to try it with two devices:

1. Open the link on each phone.
2. Enter different names, same room (default `echo`).
3. Tap **Join live**, pick a tone, send a thought.
4. The other device should show the new peer and the packet.

On GitHub Pages the client uses MQTT-over-WebSocket (`wss://broker.hivemq.com:8884/mqtt`) so phones can meet without a host we control. Topics are `echomind/v1/{room}/...`.

Self-host the same UI plus a native WebSocket mesh (no npm):

```bash
node live/server.js
# http://localhost:8788   ws://localhost:8788/mesh
```

`client/` is republished to `gh-pages` by `.github/workflows/deploy-pages.yml`. If github.io 404s: **Settings → Pages → Deploy from a branch → `gh-pages` / `/`**.

## Phase 1 (runnable)

```bash
cd phase1
node src/index.js
node test/verify.js
node src/server.js         # HTTP API on :8787
```

## Phase 2 (realtime mock)

```bash
cd phase2
node src/index.js
node test/verify.js
```

## Phase 3 (CI)

`.github/workflows/build-test.yml` on push/PR: Phase 1 verify, Phase 2 verify, PWA file check.

## Architecture

```
[ Soma Layer ]      bio-sense → AffectPacket
[ Gateway Layer ]   sensors → Resonance Display
[ Flux Layer ]      sentiment ⇄ frequency
[ Mesh Layer ]      P2P phase-lock
[ Live runtime ]    WebSocket / MQTT join + thought + roster
```

| Path | Role |
|------|------|
| `client/` | Live PWA: join, send, peer lattice |
| `live/server.js` | Static host + WebSocket mesh |
| `phase1/` | In-process node mesh |
| `phase2/` | Tick / strength / sync mock |
| `flux/` | Neuro-Flux spec |
| `.github/workflows/deploy-pages.yml` | Publish `client/` → `gh-pages` |

## Consent axiom

No waveform leaves a soma without an active **consent crest**. Revocation is instantaneous. The mesh is fail-closed.
