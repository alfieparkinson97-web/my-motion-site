#!/usr/bin/env bash
# Builds the kit tier-list TikTok into tiktok/rank/out/.
#   ./make.sh          (uses kits4u.store)
#   URL=www.yoursite.co.uk ./make.sh
set -euo pipefail
cd "$(dirname "$0")"
[ -d ../node_modules ] || (cd .. && npm install)
python3 audio.py
[ "${SKIP_FRAMES:-}" = 1 ] || node render.mjs video
node render.mjs cover
gain() { ffmpeg -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | awk -v target="$2" '/^ +I:/{v=$2} END{printf "%.2f", target - v}'; }
GMIX=$(gain out/mix.wav -14)
GSFX=$(gain out/sfx.wav -16)
enc() { ffmpeg -y -loglevel error -i out/frames.mp4 -i "$1" -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -profile:v main -level 4.1 -pix_fmt yuv420p \
  -af "volume=$2dB,alimiter=limit=0.89:level=false" -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart "$3"; }
enc out/mix.wav "$GMIX" out/kits4u-rank-tiktok.mp4
enc out/sfx.wav "$GSFX" out/kits4u-rank-tiktok-nomusic.mp4
ffmpeg -y -loglevel error -i out/kits4u-rank-tiktok.mp4 -vn -c:a libmp3lame -b:a 192k out/kits4u-rank-soundtrack.mp3
echo "done: out/kits4u-rank-tiktok.mp4, out/kits4u-rank-tiktok-nomusic.mp4, out/kits4u-rank-cover.png"
