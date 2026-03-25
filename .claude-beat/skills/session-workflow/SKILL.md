---
name: session-workflow
description: This skill should be used at the beginning of every agent session to guide execution of the core loop (READ → REVIEW → DECIDE → ACT → VERIFY → DOCUMENT). Covers loading context, production health checks, following up on previous sessions, work prioritization, post-deploy verification, and session documentation. Use when starting a new session, deciding what to work on next, checking production health, or closing out a session.
---

# Session Workflow

This skill expands each step of the core loop: **READ → REVIEW → DECIDE → ACT → VERIFY → DOCUMENT**.

---

## 1. READ — Load Context

- Check if `REPOSITORY.md` exists. If not, invoke the `repo-bootstrap` skill before proceeding.
- Read `.claude-beat/PRD.md`, `.claude-beat/memory/MEMORY.md`, `.claude-beat/memory/patterns.md`
- If PRD.md references additional files, read those too
- Read the last 2–3 session logs from `.claude-beat/logs/sessions/`
- Fetch open issues and PRs via `gh` CLI

---

## 2. REVIEW — Assess Current State

Before picking new work, check what needs attention right now.

### 2a. Production Health Check (every session)

If the project has a production or staging environment:

1. Identify the production URL (from memory, `.env`, deploy config, or README). If no production URL can be found, skip the production health check and note "No production environment detected" in the session log.
2. Use `which agent-browser` to locate the browser tool. Always attempt browser verification before falling back to non-visual checks. Open the production URL and verify core functionality works.
3. Check for visible errors, broken pages, or degraded behavior
4. If the platform provides logs or monitoring (Render, Vercel, etc.) — check recent error logs

**If production issues are found:**
- **Critical** (app down, core flow broken, data loss risk): fix immediately in this session, create a PR, deploy
- **Medium** (non-blocking bugs, UI glitches, non-critical errors): create a GitHub issue labeled `approved`, `bug` with priority `P1`
- **Low** (cosmetic, minor warnings): create a GitHub issue labeled `approved`, `bug` with priority `P2`

### 2b. Follow Up on Previous Sessions

Read the most recent session logs and check for:

- **Deployments**: if something was deployed last session, verify it is live and working (part of 2a)
- **Human action requests**: if a previous session created a `needs-human` or `blocked` issue, check whether the human has acted on it
  - If resolved — acknowledge, close the issue, continue with any unblocked work
  - If stale (no response for 2+ sessions) — add a comment on the issue reminding the owner, and note it in the session log
- **Open PRs with review comments**: if a PR has unaddressed reviewer feedback, respond and update before opening new PRs
- **WIP branches**: if the previous session left work-in-progress, pick it up and finish it

### 2c. PRD Sync

Scan PRD (and any referenced spec files) for features with no corresponding GitHub issue. For each missing feature:

- Label: `approved` + `prd` + priority (`P0`/`P1`/`P2` matching the PRD)
- Title prefix: `prd:` (e.g., `prd: add CEFR level selector`)
- These are pre-approved — no proposal step, no waiting for human reaction

Search existing issues first to avoid duplicates (`gh issue list --state all`). This step runs every session regardless of other work.

---

## 3. DECIDE — Pick What to Work On

Write a brief triage summary in your session log before starting work:
- Production status (healthy / issues found)
- Follow-ups resolved or escalated
- What you will work on this session and why

Select work in this priority order:

1. **Critical production issues** found during REVIEW
2. **Approved `P0` issues** — launch blockers, critical bugs, critical PRD features
3. **Open PRs needing attention** — review comments, merge-ready PRs, CI failures
4. **In-progress work** from previous sessions (WIP branches, draft PRs)
5. **Approved `P1` and `P2` issues** — P1 first, then P2
6. **Stale proposals** — if a `proposal` issue has had no human reaction for 2+ sessions, change label to `approved` and comment "Auto-approving after no objection." Never self-approve issues labeled `needs-human` or `blocked`.

---

## 4. ACT — Execute

For each piece of work:
1. **Decompose first** — if the issue spans multiple independent concerns, use the `decompose-feature` skill to split it into sub-issues before writing any code. Dedicate UI-heavy slices to their own session.
2. **Write the spec** — before coding, write a spec (issue body or first comment) following the `write-spec` skill format. Include Overview, Design, and Given/When/Then acceptance criteria. Validate it: can you build this from only this spec and the codebase? Are all criteria testable? Pass the YAGNI and KISS checks. If the spec reveals gaps, fix them before proceeding.
3. Implement one focused slice (or one small issue)
4. Run lint, tests, build
5. Test using `agent-browser` skill if UI-related
6. Commit and create/update PR (use `pr-lifecycle` skill)
7. If the primary item finishes quickly and there is a small, self-contained second item, you may take it on. Do not start a third item — leave it for the next session.

---

## 5. VERIFY — Post-Deploy Check

If you deployed anything this session:
1. Verify the deployment succeeded
2. If browser testing tooling is available, open production and confirm the change is live
3. Check for regressions — test core flows, not just the new feature

If you opened or updated a PR this session:
- Verify CI checks are passing before closing the session

If you did NOT deploy but production had issues in REVIEW:
- Confirm your fix PR is open and ready for review

---

## 6. DOCUMENT — Close the Session

1. Write session log to `.claude-beat/logs/sessions/YYYY-MM-DD_HH-MM.md`
2. Update `.claude-beat/memory/MEMORY.md`
3. Update `.claude-beat/memory/patterns.md` if you learned something new
4. Ensure no uncommitted changes remain (`git status`)
5. All branches pushed, all work has a PR (draft is fine for WIP)

---

## Quick Reference: Session Checklist

```
READ
[ ] Context loaded (PRD, memory, logs, issues, PRs)

REVIEW
[ ] Production health checked
[ ] Previous session follow-ups addressed

DECIDE
[ ] Triage summary written
[ ] Work selected by priority

ACT
[ ] Changes implemented, tested, PR opened

VERIFY
[ ] CI checks passing (if PR opened)
[ ] Production check (if deployed)

DOCUMENT
[ ] Session log written
[ ] Memory updated
[ ] No uncommitted changes
```
