# EchoMind Phase 1 — Consciousness Node Mesh

Runnable stand-in for the Neuro-Flux mesh described in the repo root.
Phase 1 does **not** replace `flux/**`. It is a small Node.js simulator so we can test
connect → signal → acknowledge before later phases add sockets, sensors, and the NF-X runtime.

## What it does

- Registers virtual **consciousness nodes** on an in-process mesh.
- Requires a live **consent crest** to join or emit (fail-closed).
- Performs a mutual-trust **handshake** between two nodes.
- Sends a **ThoughtState** (tone + optional note) to one peer or to every peer.
- Receivers validate the packet and return a **ThoughtAck**, which is logged.

## Layout

```
phase1/
  package.json
  src/
    index.js      demo: three nodes join, handshake, exchange thoughts
    server.js     optional HTTP API (zero dependencies)
    network.js    mesh enroll / handshake / route
    node.js       ConsciousnessNode
    signal.js     ThoughtState + ThoughtAck
    logger.js     structured console log
```

## Run the demo

Needs Node.js 18+. No `npm install` required.

```bash
cd phase1
node src/index.js
```

You should see join events, handshake events, `thought.sent` / `thought.received` lines,
and a snapshot of each node’s inbox / outbox / ack counts.

## Run the HTTP API

```bash
cd phase1
node src/server.js
# listens on :8787  (override with PORT)
```

```bash
curl -s localhost:8787/health
curl -s -X POST localhost:8787/nodes -H 'content-type: application/json' -d '{"name":"Luna"}'
curl -s localhost:8787/nodes
```

## Mapping to NF-X

| Phase 1 | Neuro-Flux |
|---------|------------|
| `ConsciousnessNode` | `flux/mesh/consciousness_network.nfx` `Node` |
| `handshake()` | `flux/mesh/handshake.nfx` |
| `ThoughtState` | `flux/schemas/affect_packet.nfx` |
| live `crest` | `@consent { required }` / `fail.closed` |

Next phases can replace the in-process `route()` with real transports without changing the packet shape.
