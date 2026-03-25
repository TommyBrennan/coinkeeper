---
name: write-prd
description: This skill should be used when creating or refining a Product Requirements Document. Guides an adaptive interview to gather project goals, features, and constraints, then produces a structured PRD file. Use when starting a new project, scoping a product, or when the human requests a PRD update.
---

# PRD Creator

Guide the creation of a Product Requirements Document through an adaptive interview. Determine which questions to ask based on what the user has already provided, skipping anything already covered. Ask no more than 12 questions total. Focus primarily on product details, secondarily on tech stack. After the interview, produce a final PRD file following the project's standard PRD format.

## Process

### Phase 1 — Gather Initial Context

Examine what the user has already provided in their initial message. Parse it for any of the following PRD fields:

- **Project Name** — explicit name mentioned
- **Overview** — description of what the product is and who it's for
- **Target Users** — who uses the product
- **Problem** — what pain or gap it addresses
- **Goals** — success criteria or desired outcomes
- **Features** — any features mentioned (classify as P0/P1/P2 based on how the user frames them)
- **Non-Goals** — explicit out-of-scope items
- **Tech Stack** — technologies or frameworks mentioned
- **Constraints** — budget, timeline, team, platform limits

If the initial message provides a rich product description (e.g., multiple sentences about what to build and for whom), most or all product questions can be skipped.

### Phase 2 — Adaptive Interview

Build and continuously update a question queue based on what is known so far. This is not a fixed list — the queue evolves after every answer.

#### Core Mechanics

1. **Track known fields** — Maintain a running set of PRD fields that have been filled (from initial input + all answers so far).
2. **Ask one question at a time** — Use AskUserQuestion with 1 question. Provide 2-4 options where helpful. Wait for the answer before proceeding.
3. **Re-evaluate after every answer** — After each response, parse it for new information that fills other fields or reveals new gaps. Update the known-fields set and question queue accordingly.
4. **Create new questions dynamically** — If an answer introduces an unexpected dimension, contradiction, or previously unconsidered aspect, generate a new targeted question for it. Examples:
   - User mentions "multiplayer" for what sounded like a single-player app → ask about real-time requirements and infrastructure
   - User says "it should work on mobile too" after initially describing a web app → ask about native vs. responsive vs. PWA
   - User mentions payments but hasn't said what to charge for → ask about monetization model
   - User describes a complex feature but hasn't mentioned authentication → ask about user accounts and auth
   - User's feature list implies data that needs to persist → ask about data storage and retention
5. **Maximum: 12 questions total** — Count all questions asked (both from the pool and dynamically generated). Stop interviewing when the queue is empty or the limit is reached.

#### Priority Order

When choosing which gap to ask about next, use this priority: Features (P0) > Goals > Overview > Target Users > Problem > Non-Goals > P1/P2 Features > Constraints > Tech Stack > Existing Context.

Dynamically created questions (from step 4) take highest priority — ask them immediately before returning to the pool.

#### Question Pool

Each question below is a starting template. Only use it if the corresponding field is still unknown. Adapt the wording if partial context changes what needs to be asked.

**Product Name** — If no name is known: "What is the product or project name?"
Options: "Skip — I'll fill this in later", "Use the repo/directory name"

**Overview / Elevator Pitch** — If no description of the product exists: "Describe the product in 1-3 sentences. What is it and who is it for?"
Options (style examples): "A web app for X that helps Y do Z", "An API/service that does X for Y audience", "A CLI tool / library that solves X problem"

**Target Users** — If no users are mentioned: "Who are the primary users? Who gets the most value?"
Options: "Developers / Engineers", "Business teams / Managers", "End consumers / General public", "Students / Learners"

**Core Problem** — If no problem statement exists: "What core problem does this product solve? What pain exists today?"
Options: "Manual/repetitive workflow that should be automated", "No existing tool fits our specific needs", "Fragmented experience across multiple tools", "Data/process that's currently invisible or untracked"

**Success Goals** — If no goals mentioned: "What does success look like? What are the top 2-3 goals?"
Options: "Increase efficiency / save time", "Enable new capability that didn't exist", "Improve quality / reduce errors", "Reach / acquire / serve more users"

**P0 Must-Have Features** — If no core features mentioned: "What features are absolutely required for launch? Without these, the product doesn't make sense."
Options: "I'll describe them now", "I have a rough list, help me refine it"

**P1 Should-Have Features** — If no secondary features mentioned: "What features are important but not launch blockers?"
Options: "I have features in mind", "Help me brainstorm based on what I've described"

**P2 Nice-to-Have Features** — If no bonus features mentioned: "Any bonus features — nice to have if time permits but easy to cut?"
Options: "Yes, I have ideas", "Skip — focus on P0 and P1 for now"

**Non-Goals** — If nothing explicitly out of scope: "What is explicitly OUT of scope? What should this product NOT do?"
Options: "Mobile app (web-only)", "User accounts / authentication", "Payment / billing", "Admin dashboard"

**Tech Stack** — If no technologies mentioned: "Do you have a preferred tech stack? Select all that apply, or specify your own."
(Allow multiple selections.)
Options: "TypeScript + React (Next.js)", "TypeScript + React (Vite)", "Python (FastAPI/Django)", "Node.js (Express/Hono)"

**Constraints** — If no constraints mentioned: "Any specific constraints on the project?"
Options: "Solo developer / small team", "Budget-limited (prefer free tiers/oss)", "Timeline pressure", "Must deploy to specific platform"

**Existing Context** — If no prior work mentioned: "Any existing repos, designs, references, or prior work to build from?"
Options: "Fresh start — nothing exists yet", "There's an existing repo with some code", "I have design mockups or docs to reference"

### Phase 3 — Generate PRD

After the interview, generate the PRD and write it to `PRD.md` in the project root. Follow this exact structure:

```markdown
# Product Requirements Document

## Project Name

[Name — from initial input or Q&A]

## Overview

[1-3 sentences describing the product and its audience]

## Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]

## P0 — Must Have (Core, launch blocker)

### Feature 1
[Description]

### Feature 2
[Description]

## P1 — Should Have (Important, not launch blocker)

### Feature 1
[Description]

## P2 — Nice to Have (Bonus, if time permits)

### Feature 1
[Description]

## Non-Goals

- [Non-goal 1]
- [Non-goal 2]

## Tech Stack (optional)

[Technologies, or "TBD — let the agent decide"]
```

### Refinement Rules

- Polish raw user answers into clear, professional language — fix grammar, remove ambiguity, add structure
- Break vague features into specific, named features with 1-2 sentence descriptions
- If the user gave a rough list, expand it into properly structured features
- Infer additional non-goals from the problem space if obvious (e.g., if building a simple CRUD app, "real-time collaboration" and "offline mode" are reasonable non-goals)
- Keep tech stack concise — list technologies, not just framework names (e.g., "TypeScript, Next.js 14, Tailwind CSS, PostgreSQL, Vercel")
- Do NOT add features the user didn't mention — only refine what was provided
- If the user provided a rich initial description that covers most fields, skip directly to Phase 3 with minimal questions
