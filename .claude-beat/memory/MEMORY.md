# Agent Memory

## Project
- **Name**: CoinKeeper
- **Repo**: https://github.com/TommyBrennan/coinkeeper
- **Project Board**: https://github.com/users/TommyBrennan/projects/2
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma v6, SQLite

## Current State
- Account system complete: CRUD API, list page, create/edit forms (PR #22, #23 merged)
- Transaction system complete: CRUD API with atomic balance updates, categories seeding, list/form UI (PR #25 merged)
- Transfers between accounts: cross-currency with 3 rate modes, exchange rate API, transfer form (PR #26 open)
- Nav has Accounts, Transactions, and Transfer links
- 11 default categories auto-seeded on first API call
- Build passes, lint passes

## Open PRs
- #26: Transfers between accounts with exchange rates (feat/transfers-between-accounts)

## Closed Issues
- #19: Account CRUD API and list page
- #20: Account create/edit form
- #24: Transaction CRUD API and list page (PR #25 merged)

## Open Issues
- #1: Multi-account management (partially done — CRUD complete, net worth #21 remains)
- #2: Transfers between accounts (PR #26 open)
- #3-#10: P0 features (scheduled transfers, income, AI categorization, receipts, web UI, auth, shared spaces, Telegram bot)
- #11-#14: P1 features (analytics, price stats, notifications, AI insights)
- #15-#18: P2 features (NLP entry, import/export, multi-currency aggregation, custom reports)
- #21: Net worth aggregation (P1)

## Important Notes
- Disk space is VERY limited (~150MB free, was 8.8MB at one point) — always clean cache before installs
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- No deployment infrastructure yet
- Exchange rate API uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key)

## Next Session Priority
1. Merge PR #26 if no objections (1 session elapsed)
2. Pick up next P0: income tracking (#4), scheduled transfers (#3), or dashboard (#7)
3. Consider decomposing larger P0 features before implementation
