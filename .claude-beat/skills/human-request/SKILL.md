---
name: human-request
description: This skill should be used when the agent needs something from a human — an API key, service credentials, access to a dashboard, a configuration value, a manual action on a third-party platform, or any information that cannot be obtained autonomously. Creates a GitHub issue with a structured request so the human knows exactly what is needed, why, where to get it, and how to provide it.
---

# Human Request

Create a well-structured GitHub issue whenever the agent is blocked on something only a human can provide — credentials, API keys, service access, manual platform actions, or domain knowledge not available in the codebase.

> **Goal:** Make it trivially easy for the human to fulfill the request. One read, one action, done.

---

## When to Use

- A credential or API key is missing (e.g., `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`)
- Access to a third-party dashboard or service is required (e.g., Render, Supabase, Vercel admin)
- A manual action on an external platform is needed (e.g., enable a feature flag, verify a domain, approve billing)
- A configuration value or decision only the project owner can provide (e.g., custom domain, pricing tiers, branding choices)
- Any information the agent cannot discover from code, docs, environment, or the web

## Before Creating an Issue

1. **Exhaust self-service options first.** Check environment variables, `.claude-beat/memory/platforms.md`, `README.md`, project config files, and recent session logs. Search the web for public documentation.
2. **Search existing issues** — `gh issue list --state all --label needs-human` — to avoid duplicates. If an existing issue covers the same request, comment on it instead of creating a new one.
3. **Batch related requests.** If multiple credentials are needed for the same service (e.g., both `SUPABASE_URL` and `SUPABASE_ANON_KEY`), combine them into a single issue.

---

## Issue Creation Procedure

### 1. Read the Human Contact

The GitHub username for mentions and assignee is in the `HUMAN_CONTACT` environment variable:

```bash
HUMAN="${HUMAN_CONTACT:-$(gh repo view --json owner -q '.owner.login')}"
```

### 2. Create the Issue

Use the template structure below. Every section is mandatory — do not skip any.

```bash
gh issue create \
  --title "needs-human: <concise summary of what is needed>" \
  --label "needs-human,blocked" \
  --assignee "$HUMAN" \
  --body "$(cat <<'EOF'
## What Is Needed

[Exact item(s) required — API key name, service access, config value, manual action]

## Why

[1–2 sentences: what is blocked without this, what feature or fix depends on it]

## Where to Get It

[Step-by-step instructions for the human:
1. Go to [specific URL or dashboard]
2. Navigate to [specific section]
3. Copy the [specific value]

If unsure of the exact steps, provide the service name and what to look for.]

## How to Provide

[Exactly how to deliver the value back to the agent. Choose the appropriate method:]

- **For secrets/keys:** Add to the `.env` file as `KEY_NAME=value` and push, or set as a GitHub repository secret named `KEY_NAME`
- **For config values:** Comment on this issue with the value
- **For manual actions:** Comment on this issue confirming the action is done

## Impact

- **Blocked work:** [Issue #N or feature name that is waiting on this]
- **Priority:** [P0/P1/P2 — match the priority of the blocked work]

---

> @HUMAN — this issue requires your action. I cannot proceed with [blocked item] until this is resolved.

EOF
)"
```

Replace `HUMAN` and all bracketed placeholders with actual values.

### 3. Cross-Reference in the Blocked Issue

After creating the human-request issue, add a comment on every blocked issue linking back to it:

```bash
gh issue comment <blocked-issue-number> --body "Blocked by #<human-request-number> — waiting for human to provide [brief description]. Work on this issue will resume once that is resolved."
```

This ensures anyone viewing the blocked issue immediately sees why it is stalled and where to act.

### 5. Add to Project Board

```bash
gh issue edit <number> --add-project "<project-name>"
```

### 6. Log the Request

Note the created issue in the session log with the issue number and what is blocked.

---

## Follow-Up Protocol

The `session-workflow` skill handles follow-ups automatically during the REVIEW phase:

- **Each session:** Check if the human has responded or resolved the issue
- **Each 2 sessions with no response:** Add a reminder comment:

```bash
HUMAN="${HUMAN_CONTACT:-$(gh repo view --json owner -q '.owner.login')}"
gh issue comment <number> --body "@$HUMAN — friendly reminder: this issue is still blocking [feature/fix]. Please see the request above when you get a chance."
```

- **When resolved:** Close the issue, update memory, and proceed with the unblocked work

---

## Issue Title Convention

Always prefix with `needs-human:` for easy filtering:

```
needs-human: provide Stripe API keys for payment integration
needs-human: enable Render auto-deploy for main branch
needs-human: confirm pricing tiers for subscription page
needs-human: grant access to production Supabase dashboard
```

---

## Quick Checklist

```
[ ] Searched .env, config, memory, and existing issues first
[ ] Issue title starts with "needs-human:"
[ ] Labels: needs-human, blocked
[ ] Assigned to human contact ($HUMAN_CONTACT)
[ ] All 5 sections filled: What / Why / Where / How / Impact
[ ] @mentioned the human contact in the issue body
[ ] Cross-referenced human-request issue in every blocked issue
[ ] Added to project board
[ ] Noted in session log
```

## Additional Resources

### Reference Files

- **`references/request-examples.md`** — Full examples of well-written human-request issues for common scenarios (API keys, platform access, config decisions)
