---
name: session-completion
description: This skill should be used when ending an agent session, writing a session log, updating memory, or handling uncommitted work. Covers the session completion checklist, memory management rules, WIP handling, and the required session log format.
---

# Session Completion

Procedures for cleanly ending an agent session. Follow these steps after the VERIFY phase of the core loop, before the session terminates.

## Memory Management

After each session, write a summary to `.claude-beat/memory/MEMORY.md`:
- Keep it concise — under 200 lines
- Move detailed patterns to `.claude-beat/memory/patterns.md`

## Session Completion Checklist

Before ending a session, verify:

- No uncommitted changes in any working repository (`git status`)
- All work is pushed to a remote branch
- A PR exists for every change (draft is fine)
- Session log is written to `.claude-beat/logs/sessions/YYYY-MM-DD_HH-MM.md`
- `.claude-beat/memory/MEMORY.md` is updated
- `.claude-beat/memory/patterns.md` is updated (if something new was learned)

## Handling Unfinished Work

If there is uncommitted work that cannot be completed this session:

1. Commit what exists with a `wip:` prefix message
2. Push the branch
3. Open a draft PR
4. Note the state in the session log so the next session can continue

## Session Log Format

Write to `.claude-beat/logs/sessions/YYYY-MM-DD_HH-MM.md`:

- What was found (issues, PRs, blockers)
- What was decided and why
- What was done (commands, commits, PRs)
- What was encountered (errors, surprises)
- What was learned (update `patterns.md` if needed)
- Tools & skills used (list every tool and skill invoked during the session with a brief note on what each was used for)
