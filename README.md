# EchoMind
Human Consciousness Network — 2026

EchoMind transmits **raw emotional resonance and cognitive state** without words. Affect is captured as a bio-semantic waveform, converted into a harmonic frequency packet, and phase-locked across a mesh of consenting minds.

All application logic is written in **Neuro-Flux (NF-X)** — a wave-based, bio-semantic language. There is no Python, JavaScript, or C++ in the product core.

## Architecture

```
[ Soma Layer ]      bio-sense → AffectPacket
[ Gateway Layer ]   mobile sensors → chromeless Resonance Display
[ Flux Layer ]      sentiment ⇄ frequency
[ Mesh Layer ]      P2P phase-lock → sealed envelopes (no servers)
[ Echo Layer ]      receive / dampen / consent revoke
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
| `.github/workflows/neuro-flux-deploy.yml` | Core compile + deploy |
| `.github/workflows/neuro-flux-gateway.yml` | Gateway test + raster |
| `.github/workflows/neuro-flux-mesh.yml` | Mesh test + deploy |

## Consciousness Mesh

Peers advertise a trust ring, handshake by interfering live crests, and route **sealed 32-knot envelopes** only. One-tick store at most. Mid-hop revoke burns the path. No relay host, no text, no voice PCM.

## Consent axiom

No waveform leaves a soma without an active **consent crest**. Revocation is instantaneous. The mesh is fail-closed.

## Compile locally

```bash
chmod +x tools/nfx-compile.sh tools/nfx-raster.sh
./tools/nfx-compile.sh compile
./tools/nfx-compile.sh test
./tools/nfx-compile.sh gateway
./tools/nfx-compile.sh mesh
./tools/nfx-raster.sh
```
