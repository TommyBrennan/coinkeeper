---
name: decompose-feature
description: This skill should be used when starting work on any feature, especially PRD-synced issues. Guides decomposition of large features into focused vertical slices — each slice gets its own branch, PR, and merge cycle. Use when picking up a new issue, during the DECIDE phase, or when a feature spans multiple independent concerns.
---

# Incremental Implementation

## The Rule

**One session = one focused concern.** Do not implement an entire MVP or multiple unrelated features in a single session. Each session should deeply focus on one well-scoped piece of work — a single feature area, a single concern, a single layer of the product.

The goal is **deep concentration** — staying focused on one concern lets you fully understand the problem, produce higher-quality code, and catch more issues. Spreading across many concerns means shallow work everywhere.

---

## What Is a Well-Scoped Issue?

A well-scoped issue is something you can fully implement, test, and open a PR for while staying focused within one area of the codebase. It covers **one independent concern**.

**Good scope — one concern:**
- "Add task creation form with API endpoint" (one CRUD operation, end-to-end)
- "Build the dashboard layout with stat cards" (one page, focused UI)
- "Add authentication: registration + login + session" (one system, cohesive)
- "Set up database schema and seed data for tasks" (one layer, foundational)

**Too broad — multiple independent concerns:**
- "Build the entire task management MVP" (data model + CRUD + UI + search + filters + keyboard shortcuts)
- "Add auth, dashboard, and task creation" (three unrelated features)
- "Set up infrastructure and implement the first feature" (two different kinds of work)

---

## When to Decompose

Before writing any code for an issue, ask: "Does this span multiple independent concerns that could be implemented and shipped separately?" If yes — split it.

**Always decompose when:**
- The issue describes a full feature set with multiple independent behaviors
- The PRD section covers more than one user-facing workflow
- Implementation mixes unrelated concerns (e.g., auth + dashboard + data model all in one)

**Skip decomposition when:**
- The issue covers a single cohesive concern, even if it's substantial
- Splitting would create slices that aren't independently functional
- The issue is already a bug fix or focused task

---

## How to Slice

Prefer **vertical slices** (thin end-to-end) over **horizontal layers** (all models, then all APIs, then all UI).

### Good slices (vertical, each independently works)

```
Issue: "prd: add task management"

Slice 1: Data model + seed data + basic task list view (read-only)
Slice 2: Task creation — form, API endpoint, validation
Slice 3: Task editing and deletion with confirmation
Slice 4: Search, filtering, and keyboard shortcuts
```

### Bad slices (horizontal, nothing works until all are done)

```
Slice 1: All database models and migrations
Slice 2: All API endpoints
Slice 3: All UI components
Slice 4: Wire everything together
```

### Slicing heuristics

1. **Start with the read path** — display data before allowing mutations
2. **Group related mutations** — create, or edit+delete, are natural units
3. **Core before polish** — basic functionality first, then search, filters, keyboard shortcuts, animations
4. **Happy path first** — error handling, edge cases, and advanced validation can follow
5. **Infrastructure only when needed** — don't set up auth, database, or deployment until a slice requires it

---

## UI-First Sessions

When a slice is primarily UI work — initial page layout, new screens, design-heavy components — dedicate the **entire session** to it. Do not mix UI work with backend logic or infrastructure in the same session.

This lets you:
- Focus deeply on visual quality, spacing, responsiveness
- Iterate on the design without being pulled into API or data concerns
- Use `agent-browser` thoroughly to verify the result

If the UI slice also needs a basic API or mock data to render, that's fine — but keep the focus on the visual output.

---

## Workflow

### Step 1: Create sub-issues

When you pick up a feature issue that needs decomposition:

1. Analyze the issue and identify vertical slices
2. Create a sub-issue for each slice, labeled `approved` + same priority as the parent
3. Add `Part of #<parent>` in each sub-issue body
4. Add a checklist to the parent issue tracking the sub-issues
5. Close the parent issue with a comment: "Decomposed into #X, #Y, #Z — implementing incrementally"

Sub-issue title format: `feat: <specific slice description>` (not the parent's generic title).

### Step 2: Implement one slice per session

- Pick the next unblocked sub-issue
- Implement, test, open PR — following the normal `pr-lifecycle`
- Each slice should build on the previous merged work
- If the previous slice's PR hasn't merged yet, either:
  - Work on an unrelated issue while waiting
  - Stack the branch on top of the previous one (note the dependency in the PR)

### Step 3: Verify the whole after all slices merge

After the final slice merges, do a quick end-to-end check of the full feature. If integration issues surface, fix them in a follow-up PR.

---

## Decomposition Template

When creating sub-issues, use this structure in the parent issue comment:

```markdown
## Decomposition

Implementing this feature incrementally:

- [ ] #101 — data model + seed data + read-only list view
- [ ] #102 — task creation form + API endpoint
- [ ] #103 — edit/delete + confirmation dialog
- [ ] #104 — search, filters, keyboard shortcuts

Each slice is a separate PR. Closing this parent issue.
```

---

## Examples

### Example: "prd: user authentication"

Instead of one massive PR with everything:

| Slice | Concern | Session focus |
|-------|---------|---------------|
| 1 | User model + registration + login endpoints + session management | Backend + auth logic |
| 2 | Signup and login UI + form validation + error states | UI (dedicated session) |
| 3 | Protected routes + logout + session expiry | Integration |

### Example: "prd: project dashboard"

Instead of building the entire dashboard at once:

| Slice | Concern | Session focus |
|-------|---------|---------------|
| 1 | Dashboard page layout + stat cards + responsive grid | UI (dedicated session) |
| 2 | Data fetching + API endpoints for metrics | Backend |
| 3 | Charts with real data + loading states | Integration |
| 4 | Date range filters + refresh | Feature addition |
