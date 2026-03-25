# ElevenLabs Voice Reference

## Model

Use `eleven_turbo_v2` for fast generation with good quality.

## Voice IDs

| ID | Name | Style |
|----|------|-------|
| `21m00Tcm4TlvDq8ikWAM` | Rachel | Calm, clear, female |
| `ErXwobaYiN019PkySvjV` | Antoni | Confident, male |
| `pNInz6obpgDQGcFmaJgB` | Adam | Neutral, male |

## Voice Settings

```json
{
  "stability": 0.4,
  "similarity_boost": 0.8
}
```

- Lower stability (0.3-0.5) = more expressive, natural
- Higher similarity_boost (0.7-0.9) = closer to original voice

## Script Optimization

- Use natural sentence breaks (periods, not commas)
- Spell out abbreviations that might be mispronounced
- Add `[pause]` markers between scenes if needed

## Measuring Audio Duration

```bash
ffprobe -v quiet -show_entries format=duration -of csv=p=0 /tmp/audio_01.mp3
```

## Common Errors

**401 Unauthorized:** Check `ELEVENLABS_API_KEY` is set and not expired.

**429 Rate Limited:** Wait and retry. Free tier has limited concurrent requests.
