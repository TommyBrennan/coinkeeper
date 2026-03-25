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
- Income tracking: source field, dedicated UI, recurring support (PR #27 open)
- Nav has Accounts, Transactions, Income, Transfer links
- 16 default categories auto-seeded (11 expense + 5 income + Other)
- Transaction model has `source` field for income origin tracking
- RecurringRule model used for recurring income
- Build passes, lint passes

## Open PRs
- #27: Income tracking with source and recurring support (feat/income-tracking)

## Closed Issues
- #19: Account CRUD API and list page
- #20: Account create/edit form
- #24: Transaction CRUD API and list page (PR #25 merged)
- #2: Transfers between accounts (PR #26 merged)

## Open Issues
- #1: Multi-account management (partially done — CRUD complete, net worth #21 remains)
- #3: Scheduled transfers (P0)
- #4: Income tracking (PR #27 open)
- #5-#10: P0 features (AI categorization, receipts, web UI, auth, shared spaces, Telegram bot)
- #11-#14: P1 features (analytics, price stats, notifications, AI insights)
- #15-#18: P2 features (NLP entry, import/export, multi-currency aggregation, custom reports)
- #21: Net worth aggregation (P1)

## Important Notes
- Disk space is VERY limited (~150MB free) — always clean cache before installs
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- No deployment infrastructure yet
- Exchange rate API uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key)
- agent-browser not available (no Chromium on ARM64)

## Next Session Priority
1. Merge PR #27 if no objections (1 session elapsed)
2. Pick up next P0: scheduled transfers (#3), or dashboard (#7)
3. Decompose larger P0 features (auth #8, shared spaces #9, Telegram #10) before implementation
