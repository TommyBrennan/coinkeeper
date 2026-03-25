---
name: write-spec
description: This skill should be used before implementing any issue. Guides writing a spec with overview, design, and Given/When/Then acceptance criteria, then validating the spec before coding begins. Use during the ACT phase, after decomposition but before implementation.
---

# Spec-First Development

Before writing any code for an issue, write a spec and validate it. The spec is written as the issue body (for new issues) or as the first comment (for existing issues). Never start coding without a validated spec.

---

## Spec Format

```markdown
# Feature Name

## Overview
[1-2 paragraph description of what this feature does and why]

## Design
[How it works, key decisions, configuration options]

## Acceptance Criteria

### Criterion Name
- **Given** [precondition]
- **When** [action]
- **Then** [expected outcome]

[Repeat for each testable behavior]
```

### Related issues

Reference related issues when features interact:
- `Depends on #N` — this issue requires another to be completed first
- `Blocks #N` — another issue is waiting on this one

---

## Guidelines

- **No code examples** — specs describe observable behavior, not implementation details
- **Focus on what, not how** — describe what the user sees and experiences, not internal mechanics
- **One behavior per criterion** — each Given/When/Then should test exactly one thing
- **Be specific** — "the task appears in the list" is better than "it works correctly"
- **Keep it minimal** — only include requirements that are actually needed for this slice

---

## Validate Before Implementing

Read the spec as if you are seeing this issue for the first time. Then run through this checklist:

- [ ] **Buildable** — can you implement this from ONLY this spec and the codebase, with no guesswork?
- [ ] **Testable** — every acceptance criterion has a clear pass/fail condition?
- [ ] **Unambiguous** — no requirements that could be interpreted multiple ways?
- [ ] **YAGNI** — is every requirement actually needed for this slice? Remove anything speculative.
- [ ] **KISS** — is this the simplest design that satisfies the criteria? If a simpler approach works, use it.

If validation reveals gaps or ambiguity — update the spec first, then implement.

---

## Examples

### Example: task creation

```markdown
# Task Creation

## Overview
Users need to create tasks from the main task list view. A task has a title
(required) and an optional description. New tasks appear at the top of the list.

## Design
A creation form appears inline at the top of the task list when triggered.
The form submits via POST to /api/tasks. No page reload — the new task is
prepended to the list optimistically.

## Acceptance Criteria

### Create a task with title only
- **Given** the user is on the task list page
- **When** they open the creation form, type "Buy groceries", and submit
- **Then** a task "Buy groceries" appears at the top of the list

### Create a task with title and description
- **Given** the user is on the task list page
- **When** they create a task with title "Buy groceries" and description "Milk, eggs, bread"
- **Then** the task appears with both title and description visible

### Title is required
- **Given** the creation form is open
- **When** the user submits with an empty title
- **Then** the form shows a validation error and no task is created

### Dismiss the form
- **Given** the creation form is open
- **When** the user presses Escape
- **Then** the form closes and no task is created
```

### Example: authentication login

```markdown
# User Login

## Overview
Registered users need to log in to access their account. Login uses
email and password. On success, the user is redirected to the dashboard.

## Design
Login form at /login. Credentials are validated against the users table
with bcrypt. On success, a session cookie (httpOnly, secure) is set.

## Acceptance Criteria

### Successful login
- **Given** a registered user with email "user@example.com"
- **When** they enter correct email and password and submit
- **Then** they are redirected to /dashboard and see their name in the header

### Invalid password
- **Given** a registered user with email "user@example.com"
- **When** they enter correct email but wrong password
- **Then** the form shows "Invalid email or password" (no hint about which is wrong)

### Non-existent email
- **Given** no user with email "unknown@example.com" exists
- **When** they attempt to log in with that email
- **Then** the form shows "Invalid email or password"
```
