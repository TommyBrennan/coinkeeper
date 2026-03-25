---
name: product-demo
description: This skill should be used when the product needs a polished walkthrough video — planning scenes around the happy path, recording browser interactions, generating AI voiceover, and producing a synchronized final cut.
---

# Product Demo

Create a synchronized product demo video with AI voiceover — video paced to match narration scene by scene.

## Prerequisites

- `agent-browser` CLI available (`which agent-browser`)
- `ffmpeg` installed (`which ffmpeg`)
- ElevenLabs API key in env: `ELEVENLABS_API_KEY`
- App running locally (or use production URL)

## Output

`.claude-beat/logs/demos/demo_YYYY-MM-DD.mp4` — synchronized video + voiceover, each scene timed to narration.

## Workflow

### 1. Understand the product

Read the PRD and recent session logs to identify:
- Core features to showcase
- The happy path (landing → auth → main action → result)
- Visual highlights (dark mode, keyboard shortcuts, filters, etc.)

### 2. Plan scenes

Decompose the demo into **4-8 scenes**. Each scene = one continuous action + one narration sentence.

Write a scene plan as a table:

| # | Scene name | Action in browser | Narration line |
|---|------------|-------------------|----------------|
| 1 | Landing page | Scroll down slowly | "Meet TaskTrack — task tracking, without the bloat." |
| 2 | Sign up | Fill form, click Create Account | "Create your account in seconds — no credit card." |
| 3 | Onboarding | Select use case, click Continue | "Tell it how you work — and you're in." |

**Rules for good sync:**
- Each narration line: 1-2 sentences max (~5-10 seconds of speech)
- Don't narrate what's obvious — add context or benefit instead
- End on a strong CTA line

### 3. Record each scene separately

Record a **separate WebM clip** per scene:

```bash
agent-browser record start /tmp/scene_01.webm <start-url>
# ... perform ONLY this scene's actions ...
agent-browser record stop
```

Measure actual duration:

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 /tmp/scene_01.webm
```

### 4. Generate audio per scene with ElevenLabs

Generate **one audio file per scene** for precise timing control.

> For API details, voice IDs, and voice settings: see `references/elevenlabs.md`

```bash
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/<VOICE_ID>" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "<scene narration>", "model_id": "eleven_turbo_v2", "voice_settings": {"stability": 0.4, "similarity_boost": 0.8}}' \
  --output /tmp/audio_01.mp3
```

### 5. Synchronize, concatenate, and render

For each scene, calculate `speed_factor = video_duration / audio_duration`, then time-stretch the video to match audio length. Concatenate all scenes and merge with audio.

> For full ffmpeg commands and speed factor rules: see `references/ffmpeg-sync.md`

### 6. Verify and save

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 .claude-beat/logs/demos/demo_final.mp4
```

Video and audio durations should match within ±0.5s.

Save final output:
```bash
cp .claude-beat/logs/demos/demo_final.mp4 .claude-beat/logs/demos/demo_$(date +%Y-%m-%d).mp4
```

Update `.claude-beat/memory/MEMORY.md` with demo location and scene count.

## Quality Checklist

- [ ] Each scene narration matches what's visible on screen
- [ ] No scene speed factor exceeds 6x
- [ ] Audio has no awkward pauses or cutoffs between scenes
- [ ] Final MP4 opens and plays correctly
- [ ] Video duration matches audio duration (±0.5s)
- [ ] Demo covers: landing → auth → core feature → power feature → CTA

## Additional Resources

### Reference Files

- **`references/elevenlabs.md`** — Voice IDs, model selection, voice settings, error handling
- **`references/ffmpeg-sync.md`** — Scene synchronization commands, speed factor rules, concatenation, final render, troubleshooting
