#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BEAT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$BEAT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
LOG_DIR="$BEAT_DIR/logs"
SESSION_ID="$(date +%Y-%m-%d_%H-%M)"
SESSION_LOG="$LOG_DIR/sessions/$SESSION_ID.md"
CLAUDE_LOG="$LOG_DIR/claude-$SESSION_ID.log"
LOCK_FILE="/tmp/claude-beat-${PROJECT_NAME}.lock"

# ── Prevent concurrent sessions ───────────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
  if kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "[$SESSION_ID] Another session is running (PID $LOCK_PID). Skipping." >&2
    exit 0
  else
    echo "[$SESSION_ID] Stale lock (PID $LOCK_PID dead). Clearing." >&2
    rm -f "$LOCK_FILE"
  fi
fi
trap "rm -f $LOCK_FILE" EXIT
echo $$ > "$LOCK_FILE"

# ── Ensure log dirs exist ────────────────────────────────────────────────────
mkdir -p "$LOG_DIR/sessions"

# ── Load system prompt ────────────────────────────────────────────────────────
SYSTEM_PROMPT=$(cat "$BEAT_DIR/SYSTEM_PROMPT.md")

# ── Run Claude from project root ──────────────────────────────────────────────
cd "$PROJECT_DIR"

echo "# Session: $SESSION_ID" > "$SESSION_LOG"
echo "" >> "$SESSION_LOG"

claude \
  --dangerously-skip-permissions \
  --model claude-opus-4-6 \
  --output-format stream-json \
  --verbose \
  --include-partial-messages \
  --system-prompt "$SYSTEM_PROMPT" \
  -p "Session started: $(date). Work directory: $PROJECT_DIR" \
  2>&1 | tee "$CLAUDE_LOG" | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text' || true

echo "" >> "$SESSION_LOG"
echo "---" >> "$SESSION_LOG"
echo "Session ended: $(date)" >> "$SESSION_LOG"
