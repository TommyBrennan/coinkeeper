# Agent Memory

## Project
- **Name**: CoinKeeper
- **Repo**: https://github.com/TommyBrennan/coinkeeper
- **Project Board**: https://github.com/users/TommyBrennan/projects/2
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma v6, SQLite

## Current State
- Repository bootstrapped with initial commit on `main`
- Next.js app with Prisma schema (User, Account, Transaction, Category, Receipt, RecurringRule, Space, SpaceMember, Credential)
- Build passes, lint passes
- Landing page with "Under development" badge
- 18 issues created from PRD, all on project board

## Open PRs
- None

## Open Issues
- #1-#10: P0 features (multi-account, transfers, scheduled transfers, income, AI categorization, receipts, web UI, auth, shared spaces, Telegram bot)
- #11-#14: P1 features (analytics, price stats, notifications, AI insights)
- #15-#18: P2 features (NLP entry, import/export, multi-currency aggregation, custom reports)

## Important Notes
- Disk space is very limited (~500MB free) — be careful with npm installs
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- No deployment infrastructure yet

## Next Session Priority
1. Pick up #1 (multi-account management) — decompose into sub-issues
2. Or #8 (authentication) as foundation for all user-facing features
