---
name: aceternity-ui
description: This skill should be used when adding animated React components from Aceternity UI — discovering components on ui.aceternity.com, installing via shadcn CLI, fixing common TypeScript errors, and integrating with the existing Tailwind/shadcn setup.
---

# Aceternity UI Components

Aceternity UI is a component library installed via shadcn CLI. It provides animated UI blocks — navbars, hero sections, text effects, card grids, timelines, backgrounds, and more. All components use the `motion` package (Framer Motion) and Tailwind CSS.

## Prerequisites

Install the motion package (required by all Aceternity components):

```bash
npm install motion
```

Import from `motion/react` (not `framer-motion`):

```typescript
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
```

## Workflow

1. **Discover** the right component
2. **Install** it via shadcn CLI
3. **Verify** with `npx tsc --noEmit` and fix any errors
4. **Implement** following the component's usage example

## Discover

Fetch `https://ui.aceternity.com/components` to see the full component listing. Each component page has a live demo, props/API docs, and usage examples.

The component name matches the URL slug:
- `https://ui.aceternity.com/components/floating-navbar` → `floating-navbar`
- `https://ui.aceternity.com/components/text-generate-effect` → `text-generate-effect`

If the user describes a UI pattern (e.g. "animated cards", "typewriter text"), search for it on `ui.aceternity.com` to find the matching component.

## Selecting the Right Component

Not every Aceternity component is the right fit. Before installing, evaluate against these criteria:

- **Match the project's mood.** Read the existing UI — its color palette, spacing, typography, animation intensity. A particle background doesn't belong in a calm productivity app. A subtle text-reveal doesn't belong on a gaming landing page. The component should feel native to what's already there.
- **Prefer quiet over noisy.** If two components solve the same need, pick the one with less motion. Heavy animations (particles, 3D transforms, continuous loops) fatigue users and hurt performance. Reserve them for hero sections or landing pages where they earn attention.
- **Solve a real UI need.** Don't add a component because it looks cool. Every component should serve a purpose the project already has — navigation, content reveal, data display, onboarding flow. If you can't name the need, don't install it.
- **Check weight and dependencies.** Some components pull in extra packages (e.g. `three.js` for 3D effects). Avoid heavy dependencies unless the feature justifies the cost.
- **Consider mobile.** Complex animations often degrade on mobile — stuttering, layout shifts, battery drain. If the project targets mobile users, favor CSS-based or simple opacity/transform animations over canvas or physics-based effects.

## Install

```bash
npx shadcn@latest add @aceternity/<component-name>
```

The component is placed in `@/components/ui/` alongside any existing shadcn/ui components.

## Verify and Fix

After installation, run:

```bash
npx tsc --noEmit
```

Common errors and their fixes:

| Error | Fix |
|---|---|
| `JSX.Element` is not a type | Change return type to `React.ReactNode`, add `import React from "react"` |
| Unused import (`useMotionValueEvent`, etc.) | Remove the unused import |
| Cannot find module `framer-motion` | Change import path from `framer-motion` to `motion/react` |

Do not apply these fixes blindly — only fix errors that `tsc` actually reports.
