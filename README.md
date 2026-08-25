# EchoMind
Human Consciousness Network — 2026

EchoMind transmits **raw emotional resonance and cognitive state** without words. Affect is captured as a bio-semantic waveform, converted into a harmonic frequency packet, and phase-locked across a mesh of consenting minds.

The product core is specified in **Neuro-Flux (NF-X)** under `flux/`.
Runnable layers: **Phase 1** mesh, **Phase 2** realtime mock, **Phase 3** CI + PWA, **Phase 4** live GitHub Pages deploy.

## Live app (Phase 4)

The PWA is published from `client/` to the `gh-pages` branch by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on every client change.

**Open now (works without extra settings):**
[htmlpreview · EchoMind lattice](https://htmlpreview.github.io/?https://github.com/rafirafi1111111-bot/EchoMind/blob/gh-pages/index.html)

**GitHub Pages URL (after one enable):**
[https://rafirafi1111111-bot.github.io/EchoMind/](https://rafirafi1111111-bot.github.io/EchoMind/)

Actions cannot flip Pages on by itself (`Resource not accessible by integration`). One-time in the repo:

1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **`gh-pages`** / folder **`/`** → Save

Then use the github.io link on your phone and *Add to Home Screen*.

## Phase 1 (runnable)

Virtual consciousness nodes join an in-process mesh, handshake with a consent crest, emit a `ThoughtState`, and record `ThoughtAck` responses. Zero npm dependencies. Node 18+.

```bash
cd phase1
node src/index.js          # three-node demo
node test/verify.js        # connect / signal / ack checks
node src/server.js         # optional HTTP API on :8787
```

Full notes: [`phase1/README.md`](phase1/README.md)

## Phase 2 (realtime mock)

Four nodes tick on a clock, exchange packets over an in-process event bus, and update pairwise **connection strength** plus a lattice **sync level**.

```bash
cd phase2
node src/index.js          # live tick log + final snapshot
node test/verify.js        # assert nodes stay enrolled and syncing
TICKS=24 TICK_MS=100 node src/index.js
```

Full notes: [`phase2/README.md`](phase2/README.md)

## Phase 3 (CI + web preview)

[`.github/workflows/build-test.yml`](.github/workflows/build-test.yml) runs on every push and pull request to `main`:

1. **Phase 1 mesh** — `node phase1/test/verify.js`, then a demo smoke run.
2. **Phase 2 realtime mock** — `node phase2/test/verify.js` (after Phase 1 passes).
3. **Web preview assets** — confirms the PWA files under `client/` exist.

You can also trigger it manually: **Actions → Build and Test → Run workflow**.

A failing job means a node failed to join, an ack was dropped, the Phase 2 loop crashed, or the preview shell is missing. Existing Neuro-Flux workflows (`.github/workflows/neuro-flux-*.yml`) still compile the NF-X spec separately.

### PWA / mobile-friendly preview

Static client in [`client/`](client/) — no build step.

```bash
python3 -m http.server 8080 --directory client
```

Details: [`client/README.md`](client/README.md).

## Architecture

```
[ Soma Layer ]      bio-sense → AffectPacket
[ Gateway Layer ]   mobile sensors → chromeless Resonance Display
[ Flux Layer ]      sentiment ⇄ frequency
[ Mesh Layer ]      P2P phase-lock → sealed envelopes (no servers)
[ Echo Layer ]      receive / dampen / consent revoke
[ Phase 1 runtime ] in-process Node mesh (connect / signal / ack)
[ Phase 2 runtime ] event bus + tick loop + strength / sync metrics
[ Phase 3 preview ] static PWA client + GitHub Actions verify
[ Phase 4 live ]    gh-pages + https://rafirafi1111111-bot.github.io/EchoMind/
```

| File | Role |
|------|------|
| `LANGUAGE.md` | NF-X grammar and operators |
| `flux/core/architecture.nfx` | Strata, consent, fail-closed ethics |
| `flux/schemas/affect_packet.nfx` | Canonical waveform type |
| `flux/converters/sentiment_to_frequency.nfx` | Core converter |
| `flux/converters/harmonic_lattice.nfx` | Band mapping and interference |
| `flux/mesh/consciousness_network.nfx` | Lattice routing and consent |
| `flux/mesh/sync.nfx` | Multi-node envelope sync |
| `flux/mesh/p2p_route.nfx` | Fail-closed hop paths |
| `flux/mesh/resonance_cipher.nfx` | Wave-domain seal |
| `flux/mesh/handshake.nfx` | Mutual crest exchange |
| `flux/mesh/peer_table.nfx` | Trust ring directory |
| `flux/runtime/wave_runtime.nfx` | Runtime, ticks, decay |
| `flux/gateway/**` | Sensors + Resonance Display |
| `tests/*.nfx` | Resonance, gateway, mesh suites |
| `tools/nfx-compile.sh` | compile / test / gateway / mesh |
| `phase1/` | Runnable Node.js node-mesh simulator |
| `phase2/` | Realtime tick loop, event bus, sync metrics |
| `client/` | PWA / mobile web preview |
| `.github/workflows/build-test.yml` | Phase 1 + 2 verify + preview check |
| `.github/workflows/deploy-pages.yml` | Publish `client/` to `gh-pages` |
| `.github/workflows/neuro-flux-deploy.yml` | Core compile + deploy |
| `.github/workflows/neuro-flux-gateway.yml` | Gateway test + raster |
| `.github/workflows/neuro-flux-mesh.yml` | Mesh test + deploy |

## Consciousness Mesh

Peers advertise a trust ring, handshake by interfering live crests, and route **sealed 32-knot envelopes** only. One-tick store at most. Mid-hop revoke burns the path. No relay host, no text, no voice PCM.

Phase 1 approximates that path in-process: enroll → handshake → `ThoughtState` → `ThoughtAck` → structured log.
Phase 2 keeps the path running: tick → packet → strength update → mean sync.

## Consent axiom

No waveform leaves a soma without an active **consent crest**. Revocation is instantaneous. The mesh is fail-closed.

## Compile locally (NF-X spec)

```bash
chmod +x tools/nfx-compile.sh tools/nfx-raster.sh
./tools/nfx-compile.sh compile
./tools/nfx-compile.sh test
./tools/nfx-compile.sh gateway
./tools/nfx-compile.sh mesh
./tools/nfx-raster.sh
```
