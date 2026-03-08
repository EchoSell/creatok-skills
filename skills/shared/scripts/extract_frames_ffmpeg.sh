#!/usr/bin/env bash
set -euo pipefail

# Extract frames from a local video using ffmpeg.
# Usage:
#   extract_frames_ffmpeg.sh <video_path> <out_dir> [fps]

VIDEO_PATH=${1:?"missing video_path"}
OUT_DIR=${2:?"missing out_dir"}
FPS=${3:-"1"}

mkdir -p "$OUT_DIR"

# Note: this is intentionally simple. We can add scene-detection later.
ffmpeg -hide_banner -y -i "$VIDEO_PATH" \
  -vf "fps=${FPS},scale=iw:-1" \
  "$OUT_DIR/frame_%05d.jpg" 

echo "OK: frames extracted to $OUT_DIR"