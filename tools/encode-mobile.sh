#!/bin/bash
# Phone-friendly copy of an HD film: 960x720, 50fps, keyframe every second.
# usage: encode-mobile.sh <in.mp4> <out.mp4>
ffmpeg -hide_banner -loglevel error -stats -y -i "$1" -map 0:v:0 -map 0:a:0 \
  -vf "scale=960:720:flags=lanczos" -c:v h264_qsv -preset medium -global_quality 27 -profile:v high -g 50 -bf 2 \
  -c:a aac -b:a 128k -movflags +faststart "$2.part.mp4" && mv "$2.part.mp4" "$2" && echo "DONE $2"
