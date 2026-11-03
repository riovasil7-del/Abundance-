#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
mkdir -p "$ROOT/public/media"

make_clip() {
  local name="$1" color="$2" label="$3"
  ffmpeg -y -f lavfi -i "color=c=${color}:s=540x960:d=8:r=24" \
    -vf "hue=h=12*sin(2*PI*t/8):s=1,drawtext=fontfile=${FONT}:text=${label}:fontsize=52:fontcolor=0x4A351C:x=(w-text_w)/2:y=(h/2)-24" \
    -pix_fmt yuv420p -crf 33 -preset veryfast -movflags +faststart \
    "$ROOT/public/media/${name}.mp4"
  ffmpeg -y -i "$ROOT/public/media/${name}.mp4" -frames:v 1 -q:v 4 "$ROOT/public/media/${name}.jpg"
}

make_clip amina 0xF0D2A8 AMINA
make_clip joseph 0xC9D7B8 JOSEPH
make_clip grace 0xD5E6F2 GRACE
make_clip well 0xE7D3B0 STUDNA
make_clip daniel 0xE6C8B8 DANIEL

ffmpeg -y -f lavfi -i "color=c=0xFBF6EE:s=512x512" \
  -vf "drawbox=x=46:y=46:w=420:h=420:color=0xC79645@1:t=12,drawtext=fontfile=${FONT}:text=H:fontsize=250:fontcolor=0x6F4E1D:x=(w-text_w)/2:y=(h-text_h)/2-16" \
  -frames:v 1 "$ROOT/public/icon-512.png"
ffmpeg -y -i "$ROOT/public/icon-512.png" -vf scale=192:192 "$ROOT/public/icon-192.png"
echo "media ready"
