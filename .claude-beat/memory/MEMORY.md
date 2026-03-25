# Agent Memory

## Project
- **Name**: CoinKeeper
- **Repo**: https://github.com/TommyBrennan/coinkeeper
- **Project Board**: https://github.com/users/TommyBrennan/projects/2
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma v6, SQLite

## Current State
- Account system complete: CRUD API, list page, create/edit forms (PR #22, #23 merged)
- Transaction system: CRUD API with atomic balance updates, categories seeding, list/form UI (PR #25 open)
- Nav has Accounts and Transactions links
- 11 default categories auto-seeded on first API call
- Build passes, lint passes

## Open PRs
- #25: Transaction CRUD API and list page (feat/transaction-crud-list)

## Closed Issues
- #19: Account CRUD API and list page
- #20: Account create/edit form

## Open Issues
- #1-#10: P0 features (multi-account, transfers, scheduled transfers, income, AI categorization, receipts, web UI, auth, shared spaces, Telegram bot)
- #11-#14: P1 features (analytics, price stats, notifications, AI insights)
- #15-#18: P2 features (NLP entry, import/export, multi-currency aggregation, custom reports)
- #21: Net worth aggregation (P1)
- #24: Transaction CRUD API and list page (P0, in progress via PR #25)

## Important Notes
- Disk space is very limited (~500MB free) — be careful with npm installs
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- No deployment infrastructure yet

## Next Session Priority
1. Merge PR #25 if no objections
2. Pick up next P0: transfers (#2), dashboard (#7), or decompose larger features
3. Consider #8 (auth) as it blocks multi-user features
