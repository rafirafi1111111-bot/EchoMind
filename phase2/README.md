# EchoMind Phase 2 — Realtime Mesh Mock

Event-driven simulation on top of the Phase 1 node mesh.
Four virtual nodes tick on a clock, exchange `ThoughtState` packets, and update
**connection strength** plus a lattice **sync level** — a mock of `flux/mesh/sync.nfx`.

No extra npm packages. Reuses `phase1/src`.

## Run the simulation

```bash
cd phase2
node src/index.js
```

Faster / longer:

```bash
TICKS=24 TICK_MS=100 node src/index.js
```

Each line is one tick: who spoke, mean sync (0..1), and the pairwise strengths.
The process prints a final lattice snapshot and exits cleanly.

## Verify nodes stay in sync

```bash
cd phase2
node test/verify.js
```

The script fails (exit 1) if a tick throws, a node drops off the mesh, sync is
non-finite, or the event bus records a crash.

## What is being mocked

| Piece | Role |
|-------|------|
| `ResonanceBus` | in-process stand-in for a WebSocket fan-out |
| `LatticeMetrics` | pair strength + per-node sync vs mesh mean band |
| `MeshSimulator` | clock + random directed / broadcast thoughts |

Strength starts at `0.35` and rises on an accepted ack. Sync is `1` when a node's
latest valence/band matches the mesh average.

Phase 3 can swap `ResonanceBus` for a real `ws` server without changing packet shape.
