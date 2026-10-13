#!/usr/bin/env bash
# Builds every deliverable into tiktok/out/.
#   ./make.sh                      (uses kits4u.store)
#   URL=www.yoursite.co.uk ./make.sh
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
python3 audio.py
[ "${SKIP_FRAMES:-}" = 1 ] || node render.mjs video
node render.mjs cover
node render.mjs profile
# static gain to a loudness target (no dynamic loudnorm pumping)
gain() { ffmpeg -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk -v target="$2" '/^ +I:/{v=$2} END{printf "%.2f", target - v}'; }
GMIX=$(gain out/mix.wav -14)
GSFX=$(gain out/sfx.wav -16)
ffmpeg -y -loglevel error -i out/frames.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -af volume=${GMIX}dB,alimiter=limit=0.89:level=false -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart out/kits4u-launch-tiktok.mp4
ffmpeg -y -loglevel error -i out/frames.mp4 -i out/sfx.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -af volume=${GSFX}dB,alimiter=limit=0.89:level=false -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart out/kits4u-launch-tiktok-nomusic.mp4
echo "done: out/kits4u-launch-tiktok.mp4, out/kits4u-launch-tiktok-nomusic.mp4, out/kits4u-launch-cover.png"
