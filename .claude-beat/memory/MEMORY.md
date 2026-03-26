# Agent Memory

## Project
- **Name**: CoinKeeper
- **Repo**: https://github.com/TommyBrennan/coinkeeper
- **Project Board**: https://github.com/users/TommyBrennan/projects/2
- **Tech**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma v6, SQLite

## Current State
- Account system complete: CRUD API, list page, create/edit forms
- Transaction system complete: CRUD API with atomic balance updates, categories seeding, list/form UI
- Transfers between accounts: cross-currency with 3 rate modes, exchange rate API
- Income tracking: source field, dedicated UI, recurring support
- Dashboard home page: balance overview, accounts grid, recent transactions
- Scheduled transfers: data model, CRUD API, UI, execution engine
- AI categorization: fully complete
- Receipt scanning: fully complete
- Net worth aggregation: complete
- Authentication complete: WebAuthn registration + login, session management, logout
- Shared spaces: fully complete
- Telegram bot: text expense entry, balance/spending commands, receipt photo processing all merged
  - Still blocked on TELEGRAM_BOT_TOKEN (#66 — needs-human)
- Analytics: fully complete (spending by category, trends, balance evolution)
- Product prices: fully complete (data model, page, trend charts)
- AI Financial Insights: API endpoint done (PR #84), UI pending (#83)
- Nav has Transactions, Income, Transfer, Schedules, Receipts, Accounts, Analytics, Categories, Spaces, Settings
- Build passes, lint passes

## Open PRs
- #84: AI financial insights API endpoint (feat/ai-insights-api)

## Open Issues — P0
- #81: Deploy dev and prod apps (blocked — Docker daemon not running, AGENT_NAME not set)
- #66: Bot token needed (needs-human, blocked)

## Open Issues — P1
- #83: AI financial insights dashboard UI (approved, next up)
- #13: Smart notifications

## Open Issues — P2
- #15: Natural language transaction entry
- #16: Import/Export transactions
- #17: Multi-currency account aggregation
- #18: Custom reports

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

## Next Session Priority
1. Merge PR #84 if no objections, then implement #83 (insights UI page)
2. Pick up #13 (Smart notifications) — decompose first
3. Telegram issues still blocked on bot token (#66)
4. Docker deployment still blocked (#81)
