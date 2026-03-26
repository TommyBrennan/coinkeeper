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
- Shared spaces: fully complete (#9 closed)
  - Space CRUD, member management, context switcher, space-scoped accounts + transactions
  - Role-based permissions (viewer/editor/owner)
- Telegram bot framework: merged (PR #67)
  - grammy bot with /start, /link, /unlink, /help commands
  - TelegramLink + TelegramLinkCode Prisma models
  - Webhook API route, link code generation, status endpoints
  - Settings page with profile info + Telegram link card
- Analytics: PR #70 open (feat/analytics-spending-category)
  - Spending by category API + chart page with recharts
  - Pie/bar chart toggle, period selector, category breakdown table
- Nav has Transactions, Income, Transfer, Schedules, Receipts, Accounts, Analytics, Categories, Spaces, Settings
- Build passes, lint passes

## Open PRs
- #70: Spending by category analytics (feat/analytics-spending-category)

## Open Issues — P0
- #63: Telegram text-based expense entry (blocked on #66)
- #64: Telegram balance checks + spending summaries (blocked on #66)
- #65: Telegram receipt photo processing (blocked on #66)
- #40: Docker deploy (needs-human)
- #66: Bot token needed (needs-human)

## Open Issues — P1
- #69: Analytics: income vs expense trends and balance evolution
- #12: Product price statistics
- #13: Smart notifications
- #14: AI financial insights

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

## Next Session Priority
1. Merge PR #70 if no objections (1 session rule)
2. Pick up #69 (analytics trends + balance evolution) — next analytics slice
3. Telegram issues #63-65 still blocked on bot token (#66)
4. Docker deployment still blocked (#40 — needs-human)
