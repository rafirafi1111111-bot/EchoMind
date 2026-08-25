#!/usr/bin/env sh
# Rasterize EnvelopeRaster specimen → SVG with no <text> and no controls.
# POSIX + awk only.

set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SRC="$ROOT/flux/gateway/display/envelope_raster.nfx"
OUTDIR="$ROOT/dist"
OUT="$OUTDIR/resonance_display.svg"

mkdir -p "$OUTDIR"

awk '
function flush_nums(    n,i,v) {
  n = split(buf, parts, /[ ,]+/)
  for (i = 1; i <= n; i++) {
    v = parts[i]
    if (v ~ /^-?[0-9]+(\.[0-9]+)?$/) {
      count++
      val[count] = v + 0
    }
  }
  buf = ""
}
BEGIN { mode = ""; count = 0; buf = "" }
/specimen\.face := \[/ { mode = "read"; buf = ""; next }
/specimen\.voice := \[/ { flush_nums(); face_n = count; mode = "read"; next }
mode == "read" {
  line = $0
  sub(/].*/, "]", line)
  buf = buf " " line
  if ($0 ~ /\]/) {
    flush_nums()
    mode = ""
  }
}
END {
  total = count
  voice_n = total - face_n
  if (face_n != 32 || voice_n != 32) {
    print "NF-X FAIL: specimen knots face=" face_n " voice=" voice_n > "/dev/stderr"
    exit 1
  }
  W = 1440; H = 900
  print "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
  print "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " W " " H "\" width=\"" W "\" height=\"" H "\">"
  print "<rect width=\"100%\" height=\"100%\" fill=\"#07090c\"/>"

  # voice envelope ( ~> quieter underlayer )
  printf "<polyline fill=\"none\" stroke=\"#3aa7a0\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" points=\""
  for (i = 1; i <= voice_n; i++) {
    x = (i - 1) / (voice_n - 1) * (W - 160) + 80
    y = H * 0.50 - val[face_n + i] * H * 0.36
    printf "%.2f,%.2f ", x, y
  }
  print "\"/>"

  # face envelope ( ~> carrier )
  printf "<polyline fill=\"none\" stroke=\"#e2c15a\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" points=\""
  for (i = 1; i <= face_n; i++) {
    x = (i - 1) / (face_n - 1) * (W - 160) + 80
    y = H * 0.50 - val[i] * H * 0.36
    printf "%.2f,%.2f ", x, y
  }
  print "\"/>"

  # :: phase-lock node
  print "<line x1=\"720\" y1=\"390\" x2=\"720\" y2=\"510\" stroke=\"#f2efe6\" stroke-width=\"3\" stroke-linecap=\"round\"/>"
  print "<circle cx=\"720\" cy=\"450\" r=\"7\" fill=\"#f2efe6\"/>"
  print "</svg>"
}
' "$SRC" > "$OUT"

if grep -q '<text' "$OUT"; then
  echo "NF-X FAIL: raster emitted text" >&2
  exit 1
fi

echo "NF-X OK: raster → $OUT"
