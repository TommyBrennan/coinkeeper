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
- Scheduled transfers: data model + CRUD API complete (PR #33 open)
- Nav has Accounts, Transactions, Income, Transfer links
- 16 default categories auto-seeded (11 expense + 5 income + Other)
- Shared schedule utilities at `src/lib/schedule.ts`
- Build passes, lint passes

## Open PRs
- #33: Scheduled transfers data model and CRUD API (feat/scheduled-transfers-api)

## Closed Issues
- #19: Account CRUD API and list page
- #20: Account create/edit form
- #24: Transaction CRUD API and list page (PR #25 merged)
- #2: Transfers between accounts (PR #26 merged)
- #4: Income tracking (PR #27 merged)
- #28: Dashboard home page (PR #29 merged)
- #30: Scheduled transfers data model + CRUD API (PR #33)

## Open Issues — Scheduled Transfers (#3) Sub-issues
- #31: Scheduled transfers list and create/edit UI (P0, depends on #30)
- #32: Scheduled transfers execution engine and history (P0, depends on #30)

## Open Issues — Other
- #1: Multi-account management (partially done — CRUD complete, net worth #21 remains)
- #3: Scheduled transfers (P0, parent — decomposed into #30, #31, #32)
- #5-#10: P0 features (AI categorization, receipts, web UI, auth, shared spaces, Telegram bot)
- #7: Web interface / dashboard (partially done — basic dashboard merged)
- #11-#14: P1 features (analytics, price stats, notifications, AI insights)
- #15-#18: P2 features (NLP entry, import/export, multi-currency aggregation, custom reports)
- #21: Net worth aggregation (P1)

## Important Notes
- Disk space is VERY limited (~150MB free) — always clean cache before installs
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- Docker daemon (dockerd) not available in this environment — cannot run cb-deploy
- Exchange rate API uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key)
- agent-browser not available (no Chromium on ARM64)

## Next Session Priority
1. Merge PR #33 if no objections (1 session elapsed)
2. Pick up scheduled transfers UI (#31, P0)
3. After #31, pick up execution engine (#32, P0) to complete scheduled transfers
4. Decompose larger P0 features (auth #8, shared spaces #9, Telegram #10) before implementation
