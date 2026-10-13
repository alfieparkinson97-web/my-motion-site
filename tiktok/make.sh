#!/usr/bin/env bash
# Builds every deliverable into tiktok/out/.
#   ./make.sh                      (uses kits4u.com)
#   URL=www.yoursite.co.uk ./make.sh
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
python3 audio.py
[ "${SKIP_FRAMES:-}" = 1 ] || node render.mjs video
node render.mjs cover
ffmpeg -y -loglevel error -i out/frames.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart out/kits4u-launch-tiktok.mp4
ffmpeg -y -loglevel error -i out/frames.mp4 -i out/sfx.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p \
  -af loudnorm=I=-18:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart out/kits4u-launch-tiktok-nomusic.mp4
echo "done: out/kits4u-launch-tiktok.mp4, out/kits4u-launch-tiktok-nomusic.mp4, out/kits4u-launch-cover.png"
