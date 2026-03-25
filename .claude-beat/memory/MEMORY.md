# Agent Memory

## Project
- **Name**: CoinKeeper
- **Repo**: https://github.com/TommyBrennan/coinkeeper
- **Project Board**: https://github.com/users/TommyBrennan/projects/2
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma v6, SQLite

## Current State
- Account system complete: CRUD API, list page, create/edit forms (PR #22, #23 merged)
- Transaction system complete: CRUD API with atomic balance updates, categories seeding, list/form UI (PR #25 merged)
- Transfers between accounts: cross-currency with 3 rate modes, exchange rate API (PR #26 merged)
- Income tracking: source field, dedicated UI, recurring support (PR #27 merged)
- Dashboard home page: balance overview, accounts grid, recent transactions (PR #29 merged)
- Scheduled transfers: data model, CRUD API, UI, execution engine — all complete (#3 closed)
- AI categorization: fully complete (#5 closed)
  - API endpoint with Claude integration (PR #39 merged)
  - Auto-suggest in transaction form with debounce + suggestion chip (PR #41 merged)
  - Category normalization: alias mapping (60+ aliases), fuzzy matching, title-case (PR #42 open)
  - Category management page: rename, delete, merge categories
  - AI correction feedback: stores user overrides, feeds into future prompts
  - CategoryCorrection Prisma model added
- Next.js standalone output enabled for Docker builds
- Dockerfile and .dockerignore committed
- Shared exchange rate utility at `src/lib/exchange-rate.ts`
- Core execution logic at `src/lib/execute-scheduled-transfer.ts`
- AI categorization at `src/lib/categorize.ts`
- Category normalization at `src/lib/category-normalize.ts`
- Nav has Accounts, Transactions, Income, Transfer, Schedules, Categories links
- 16 default categories auto-seeded (11 expense + 5 income + Other)
- Build passes, lint passes

## Open PRs
- #42: Category normalization, dedup, merge UI, correction feedback (feat/category-normalization-dedup)

## Closed Issues
- #19: Account CRUD API and list page
- #20: Account create/edit form
- #24: Transaction CRUD API and list page (PR #25 merged)
- #2: Transfers between accounts (PR #26 merged)
- #4: Income tracking (PR #27 merged)
- #28: Dashboard home page (PR #29 merged)
- #30: Scheduled transfers data model + CRUD API (PR #33 merged)
- #31: Scheduled transfers list and create/edit UI (PR #34 merged)
- #32: Scheduled transfers execution engine (PR #35 merged)
- #3: Scheduled transfers (parent — all sub-issues complete)
- #36: AI categorization API endpoint (PR #39 merged)
- #37: AI auto-suggest in transaction form (PR #41 merged)
- #5: AI-powered expense categorization (parent — all sub-issues complete)

## Open Issues — P0
- #1: Multi-account management (partially done — CRUD complete, net worth #21 remains)
- #6: Receipt photo expense tracking
- #7: Web interface / dashboard (partially done — basic dashboard merged)
- #8: Authentication / WebAuthn
- #9: Shared spaces
- #10: Telegram bot interface
- #38: Category normalization and dedup (PR #42 open)

## Open Issues — P1
- #11: Rich analytics dashboard
- #12: Product price statistics
- #13: Smart notifications
- #14: AI financial insights
- #21: Net worth aggregation

## Open Issues — P2
- #15: Natural language transaction entry
- #16: Import/Export transactions
- #17: Multi-currency account aggregation
- #18: Custom reports

## Important Notes
- Disk space is comfortable (~34GB free)
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- Docker daemon (dockerd) not available in this environment — cannot run cb-deploy
- Exchange rate API uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key)
- agent-browser not available (no Chromium on ARM64)
- AGENT_NAME env var not set (needed for cb-deploy)
- GitHub token lacks read:org scope (can't add to project board via gh CLI)
- ANTHROPIC_API_KEY needed for AI categorization to work (graceful degradation without it)

## Next Session Priority
1. Merge PR #42 if no objections
2. Pick next P0: receipt scanning (#6) or authentication (#8)
3. Consider decomposing chosen P0 into sub-issues before implementing
