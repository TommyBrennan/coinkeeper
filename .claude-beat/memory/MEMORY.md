# Agent Memory

## Project
- **Name**: CoinKeeper
- **Repo**: https://github.com/TommyBrennan/coinkeeper
- **Project Board**: https://github.com/users/TommyBrennan/projects/2
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma v6, SQLite

## Current State
- Account system complete: CRUD API, list page, create/edit forms, low balance threshold
- Transaction system complete: CRUD API with atomic balance updates, categories seeding, list/form UI
- Transfers between accounts: cross-currency with 3 rate modes, exchange rate API
- Income tracking: source field, dedicated UI, recurring support
- Dashboard home page: balance overview, accounts grid, recent transactions, quick-add bar
- Scheduled transfers: data model, CRUD API, UI, execution engine + confirmation notifications
- AI categorization: fully complete
- Receipt scanning: fully complete
- Net worth aggregation: complete
- Authentication complete: WebAuthn registration + login, session management, logout
- Shared spaces: fully complete
- Telegram bot: text expense entry, balance/spending commands, receipt photo processing all merged
  - Still blocked on TELEGRAM_BOT_TOKEN (#66 — needs-human)
- Analytics: fully complete (spending by category, trends, balance evolution)
- Product prices: fully complete (data model, page, trend charts)
- AI Financial Insights: fully complete (API + dashboard UI)
- Smart notifications: fully complete (except Telegram delivery — blocked on #66)
  - Done: data model + notification center, low balance warnings, transfer confirmations, expense reminders, unusual spending alerts, web push delivery
- Natural language transaction entry: complete (#15, PR #102)
  - Quick-add bar on dashboard, AI parsing + regex fallback
- Import/Export: CSV import and export complete (#16, #96, #100)
- Custom reports: SavedReport model + CRUD API merged (#104, PR #108)
- Settings page: profile, Telegram link, notification settings (expense reminder days)
- Settings API: GET/PATCH /api/settings for user preferences
- Nav has Transactions, Income, Transfer, Schedules, Receipts, Accounts, Analytics, Categories, Spaces, Settings
- Build passes, lint passes

## Open PRs
- None

## Open Issues — P0
- #81: Deploy dev and prod apps (blocked — Docker daemon not running, AGENT_NAME not set)
- #66: Bot token needed (needs-human, blocked)

## Open Issues — P1
- None (all P1 complete)

## Open Issues — P2
- #105: Custom reports — Reports page UI
- #106: Custom reports — PDF export
- #107: Custom reports — Scheduled report generation

## Important Notes
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- Docker daemon not available — cannot run cb-deploy
- AGENT_NAME env var not set (needed for cb-deploy)
- TELEGRAM_BOT_TOKEN not set — bot code built but can't connect to Telegram
- Exchange rate API: https://api.exchangerate-api.com/v4/latest/{currency} (free, no key)
- ANTHROPIC_API_KEY needed for AI features (graceful degradation without it)
- `gh pr edit --add-project` fails due to missing `read:org` scope on token
- recharts installed for analytics charts
- In-memory insights cache: 30 min TTL per user+space+period
- Low balance check has 24h cooldown to prevent notification spam
- Expense reminder check has 24h cooldown

## Completed
- #17: Multi-currency aggregation (PR #103)
- #104: Custom reports data model + CRUD API (PR #108)

## Next Session Priority
1. #105: Custom reports UI page
2. Docker deployment still blocked (#81) — check again each session
3. Telegram delivery blocked on bot token (#66)
