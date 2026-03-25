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
- AI categorization API: Claude integration, POST /api/categorize endpoint (PR #39 merged)
- AI auto-suggest in transaction form: debounced categorization, suggestion chip UI (PR #41 open)
- Next.js standalone output enabled for Docker builds
- Dockerfile and .dockerignore committed
- Shared exchange rate utility at `src/lib/exchange-rate.ts`
- Core execution logic at `src/lib/execute-scheduled-transfer.ts`
- AI categorization at `src/lib/categorize.ts`
- Nav has Accounts, Transactions, Income, Transfer, Schedules links
- 16 default categories auto-seeded (11 expense + 5 income + Other)
- Build passes, lint passes

## Open PRs
- #41: AI category auto-suggest in transaction form (feat/ai-category-autosuggest)

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

## Open Issues — AI Categorization (#5) Sub-issues
- #36: AI categorization API endpoint — done (PR #39 merged)
- #37: Auto-suggest in transaction form UI (PR #41 open)
- #38: Category normalization and dedup — next

## Open Issues — Other
- #1: Multi-account management (partially done — CRUD complete, net worth #21 remains)
- #5: AI-powered expense categorization (P0, parent — decomposed into #36, #37, #38)
- #6: Receipt photo expense tracking (P0)
- #7: Web interface / dashboard (P0, partially done — basic dashboard merged)
- #8: Authentication / WebAuthn (P0)
- #9: Shared spaces (P0)
- #10: Telegram bot interface (P0)
- #11-#14: P1 features (analytics, price stats, notifications, AI insights)
- #15-#18: P2 features (NLP entry, import/export, multi-currency aggregation, custom reports)
- #21: Net worth aggregation (P1)

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
1. Merge PR #41 if no objections (1 session elapsed)
2. Implement #38 (category normalization and dedup)
3. After #38 done, close parent issue #5
4. Consider next P0: receipt scanning (#6) or auth (#8)
