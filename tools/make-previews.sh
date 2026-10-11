#!/bin/bash
# Seek-bar preview sprites: one 192x144 frame every 10s, 10x10 frames per sheet.
# usage: make-previews.sh <vob-folder> <name> <length-seconds>
D="$1"; N="$2"; LEN="$3"; OUT="E:/photos/mir/website/media/previews"; mkdir -p "$OUT"
ffmpeg -hide_banner -loglevel error -y -fflags +genpts+discardcorrupt \
  -i "concat:$D/VTS_01_1.VOB|$D/VTS_01_2.VOB|$D/VTS_01_3.VOB|$D/VTS_01_4.VOB" -t "$LEN" -map 0:v:0 \
  -vf "crop=704:560:8:8,fps=1/10,scale=192:144,tile=10x10" -q:v 4 -start_number 0 "$OUT/${N}-%d.jpg" && echo "DONE $N"
