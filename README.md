# EchoMind
Human Consciousness Network — 2026

EchoMind transmits **raw emotional resonance and cognitive state** without words. Affect is captured as a bio-semantic waveform, converted into a harmonic frequency packet, and phase-locked across a mesh of consenting minds.

All application logic is written in **Neuro-Flux (NF-X)** — a wave-based, bio-semantic language. There is no Python, JavaScript, or C++ in the product core.

## Architecture (four strata)

```
[ Soma Layer ]     bio-sense → AffectPacket
[ Flux Layer ]     sentiment ⇄ frequency (this repo's converter)
[ Mesh Layer ]     phase-lock → Consciousness Lattice
[ Echo Layer ]     receive / dampen / consent revoke
```

| File | Role |
|------|------|
| `LANGUAGE.md` | NF-X grammar and operators |
| `flux/core/architecture.nfx` | Strata, consent, fail-closed ethics |
| `flux/schemas/affect_packet.nfx` | Canonical waveform type |
| `flux/converters/sentiment_to_frequency.nfx` | Core converter |
| `flux/converters/harmonic_lattice.nfx` | Band mapping and interference |
| `flux/mesh/consciousness_network.nfx` | Mesh routing and consent |
| `flux/runtime/wave_runtime.nfx` | Runtime, ticks, decay |
| `tests/resonance_suite.nfx` | Resonance self-tests |
| `tools/nfx-compile.sh` | Host-side NF-X compiler (POSIX shell) |
| `.github/workflows/neuro-flux-deploy.yml` | Compile + deploy pipeline |

## Consent axiom

No waveform leaves a soma without an active **consent crest**. Revocation is instantaneous. The mesh is fail-closed.

## Compile locally

```bash
./tools/nfx-compile.sh compile
./tools/nfx-compile.sh test
```
