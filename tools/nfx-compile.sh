#!/usr/bin/env sh
# Neuro-Flux host compiler — POSIX shell only (no Python / JS / C++).
# Validates WAVEFORM envelopes, required ethics marks, and emits a flux bundle.

set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT="$ROOT/dist"
MODE=${1:-compile}

fail() { echo "NF-X FAIL: $*"; exit 1; }
pass() { echo "NF-X OK: $*"; }

waveforms() {
  find "$ROOT/flux" "$ROOT/tests" -name '*.nfx' 2>/dev/null | sort
}

compile() {
  mkdir -p "$OUT"
  COUNT=0
  echo "# EchoMind flux bundle — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT/echomind.flux"
  echo "# language: Neuro-Flux NF-X 0.9" >> "$OUT/echomind.flux"

  for f in $(waveforms); do
    rel=${f#$ROOT/}
    echo "-- attune $rel"

    grep -q '^::WAVEFORM ' "$f" || fail "$rel missing ::WAVEFORM header"
    grep -q '^::END WAVEFORM' "$f" || fail "$rel missing ::END WAVEFORM"
    grep -q '^@phase {' "$f" || fail "$rel missing @phase"
    grep -q '^@consent {' "$f" || fail "$rel missing @consent"

    case "$rel" in
      flux/core/*|flux/mesh/*|flux/runtime/*|flux/schemas/*|flux/gateway/sensors/*|flux/gateway/capture/*|flux/gateway/consciousness_gateway.nfx)
        grep -q '@consent { required }' "$f" || fail "$rel must declare @consent { required }"
        ;;
    esac

    echo "----- $rel -----" >> "$OUT/echomind.flux"
    cat "$f" >> "$OUT/echomind.flux"
    echo "" >> "$OUT/echomind.flux"
    COUNT=$((COUNT + 1))
    pass "$rel"
  done

  echo "$COUNT" > "$OUT/waveform.count"
  pass "bundled $COUNT waveforms → dist/echomind.flux"
}

count_cases() {
  grep -c '^  case ' "$1" || true
}

test_suite() {
  compile
  SUITE="$ROOT/tests/resonance_suite.nfx"
  [ -f "$SUITE" ] || fail "missing resonance suite"
  CASES=$(count_cases "$SUITE")
  [ "$CASES" -ge 5 ] || fail "expected at least 5 resonance cases, found $CASES"
  pass "resonance suite: $CASES cases present"
}

gateway_suite() {
  compile
  SUITE="$ROOT/tests/gateway_suite.nfx"
  [ -f "$SUITE" ] || fail "missing gateway suite"
  CASES=$(count_cases "$SUITE")
  [ "$CASES" -ge 6 ] || fail "expected at least 6 gateway cases, found $CASES"

  DISPLAY="$ROOT/flux/gateway/display/resonance_display.nfx"
  grep -q 'field.chrome := none' "$DISPLAY" || fail "Resonance Display must forbid chrome"
  grep -q 'field.text   := none' "$DISPLAY" || fail "Resonance Display must forbid text"
  grep -q 'field.hit-targets := none' "$DISPLAY" || fail "Resonance Display must forbid hit-targets"

  SENSORS=$(find "$ROOT/flux/gateway/sensors" -name '*.nfx' | wc -l | tr -d ' ')
  [ "$SENSORS" -ge 3 ] || fail "expected >= 3 sensor waveforms"

  pass "gateway suite: $CASES cases; sensors=$SENSORS; display is chromeless"
}

case "$MODE" in
  compile)  compile ;;
  test)     test_suite ;;
  gateway)  gateway_suite ;;
  *)        fail "usage: nfx-compile.sh [compile|test|gateway]" ;;
esac
