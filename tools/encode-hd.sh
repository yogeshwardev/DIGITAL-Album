#!/bin/bash
# Joins one DVD's VOB files into a single HD film (1440x1080, 50fps, keyframe every second for instant seeking).
# usage: encode-hd.sh <vob-folder> <output.mp4> <length-seconds>
D="$1"; OUT="$2"; LEN="$3"; FO=$(awk "BEGIN{print $LEN-2}")
SRC="concat:$D/VTS_01_1.VOB|$D/VTS_01_2.VOB|$D/VTS_01_3.VOB|$D/VTS_01_4.VOB"
ffmpeg -hide_banner -loglevel error -stats -y -fflags +genpts+discardcorrupt -i "$SRC" -t "$LEN" -map 0:v:0 -map 0:a:0 \
  -filter_threads 6 -vf "crop=704:560:8:8,hqdn3d=1.5:1.5:4:4,eq=saturation=1.08:contrast=1.03,unsharp=3:3:0.5,bwdif=1,scale=1440:1080:flags=lanczos,setsar=1,fade=in:0:25,fade=out:st=$FO:d=2" \
  -c:v h264_qsv -preset medium -global_quality 26 -profile:v high -g 50 -bf 2 \
  -af "aresample=async=1000,loudnorm=I=-16:TP=-1.5:LRA=11,afade=in:d=1,afade=out:st=$FO:d=2" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart "$OUT.part.mp4" && mv "$OUT.part.mp4" "$OUT" && echo "DONE $OUT"
