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
- Telegram bot framework: PR #67 open (feat/telegram-bot-setup)
  - grammy bot with /start, /link, /unlink, /help commands
  - TelegramLink + TelegramLinkCode Prisma models
  - Webhook API route, link code generation, status endpoints
  - Settings page with profile info + Telegram link card
- Nav has Transactions, Income, Transfer, Schedules, Receipts, Accounts, Categories, Spaces, Settings
- Build passes, lint passes

## Open PRs
- #67: Telegram bot framework + user account linking (feat/telegram-bot-setup)

## Open Issues — P0
- #62: Telegram bot framework + linking (PR #67 open)
- #63: Telegram text-based expense entry
- #64: Telegram balance checks + spending summaries
- #65: Telegram receipt photo processing
- #40: Docker deploy (needs-human)
- #66: Bot token needed (needs-human)

## Open Issues — P1
- #11: Rich analytics dashboard
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

## Next Session Priority
1. Merge PR #67 if no objections (1 session rule)
2. Pick up #63 (Telegram text-based expense entry) — blocked on bot token for e2e but code can be built
3. Or pivot to P1 work (#11 analytics dashboard) if Telegram is fully blocked
4. Docker deployment still blocked (#40, #66 — needs-human)
