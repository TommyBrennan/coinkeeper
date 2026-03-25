# FFmpeg Synchronization Reference

## Per-Scene Speed Adjustment

Calculate the speed factor for each scene:

```
speed_factor = video_duration / audio_duration
```

Apply with ffmpeg `setpts`:

```bash
ffmpeg -y -i /tmp/scene_01.webm \
  -filter:v "setpts=PTS/<speed_factor>" \
  -an /tmp/scene_01_synced.mp4
```

## Speed Factor Rules

| Range | Effect | Action |
|-------|--------|--------|
| 0.5-1.0 | Video slows down | Rare — only if action was very fast |
| 1.0-3.0 | Slight speedup | Looks natural |
| 3.0-6.0 | Noticeable speedup | Still watchable for UI demos |
| >6.0 | Too fast | Re-record scene faster, or shorten narration |

If speed_factor > 6: go back and re-record that scene with faster interactions, OR split into two scenes with two narration lines.

## Concatenating Scenes

Create a concat list file:

```
file '/tmp/scene_01_synced.mp4'
file '/tmp/scene_02_synced.mp4'
...
```

Merge all video scenes (no audio yet):

```bash
ffmpeg -y -f concat -safe 0 -i /tmp/concat_list.txt \
  -c copy /tmp/video_merged.mp4
```

## Merging Audio Clips

```bash
ffmpeg -y \
  -i /tmp/audio_01.mp3 -i /tmp/audio_02.mp3 ... \
  -filter_complex "[0:a][1:a]concat=n=<N>:v=0:a=1[outa]" \
  -map "[outa]" /tmp/audio_merged.mp3
```

## Final Render

Combine merged video + merged audio:

```bash
ffmpeg -y \
  -i /tmp/video_merged.mp4 \
  -i /tmp/audio_merged.mp3 \
  -c:v libx264 -preset fast -crf 22 \
  -c:a aac -b:a 192k \
  -map 0:v:0 -map 1:a:0 \
  -shortest \
  .claude-beat/logs/demos/demo_final.mp4
```

## Troubleshooting

**Audio and video out of sync:** Re-check that ffprobe durations were measured on the final rendered clips, not source files. Re-render with `-shortest` flag.

**ffmpeg concat fails:** Ensure all scene clips have the same codec/resolution. Add `-vf scale=1280:720` to normalize if needed.

**Choppy speedup:** If speedup > 4x, consider using `minterpolate` filter for smoother motion:

```bash
ffmpeg -y -i /tmp/scene_01.webm \
  -filter:v "setpts=PTS/<speed_factor>,minterpolate='mi_mode=mci:mc_mode=aobmc:vsbmc=1'" \
  -an /tmp/scene_01_synced.mp4
```
