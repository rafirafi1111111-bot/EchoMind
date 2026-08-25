# EchoMind
Human Consciousness Network — 2026

EchoMind transmits **raw emotional resonance and cognitive state** without words. Affect is captured as a bio-semantic waveform, converted into a harmonic frequency packet, and phase-locked across a mesh of consenting minds.

All application logic is written in **Neuro-Flux (NF-X)** — a wave-based, bio-semantic language. There is no Python, JavaScript, or C++ in the product core.

## Architecture

```
[ Soma Layer ]      bio-sense → AffectPacket
[ Gateway Layer ]   mobile sensors → chromeless Resonance Display
[ Flux Layer ]      sentiment ⇄ frequency
[ Mesh Layer ]      phase-lock → Consciousness Lattice
[ Echo Layer ]      receive / dampen / consent revoke
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
| `flux/gateway/consciousness_gateway.nfx` | Gateway orchestration |
| `flux/gateway/sensors/*` | Simulated camera, mic, IMU |
| `flux/gateway/capture/realtime_ingest.nfx` | 33 ms capture pulse |
| `flux/gateway/display/*` | Chromeless envelope renderer |
| `tests/resonance_suite.nfx` | Converter self-tests |
| `tests/gateway_suite.nfx` | Gateway self-tests |
| `tools/nfx-compile.sh` | Host-side NF-X compiler |
| `tools/nfx-raster.sh` | Specimen → SVG (no text, no buttons) |
| `.github/workflows/neuro-flux-deploy.yml` | Core compile + deploy |
| `.github/workflows/neuro-flux-gateway.yml` | Gateway compile + test + raster |

## Consciousness Gateway

Simulated handset hardware (90 Hz photonic array, 64-band near-field mic, stillness IMU) feeds `MicroExpression` and `VoiceTone`. The **Resonance Display** paints only `~>` carrier strokes and `::` phase-lock geometry. No captions. No controls. Consent is the soma crest.

## Consent axiom

No waveform leaves a soma without an active **consent crest**. Revocation is instantaneous. The mesh is fail-closed.

## Compile locally

```bash
chmod +x tools/nfx-compile.sh tools/nfx-raster.sh
./tools/nfx-compile.sh compile
./tools/nfx-compile.sh test
./tools/nfx-compile.sh gateway
./tools/nfx-raster.sh
```
