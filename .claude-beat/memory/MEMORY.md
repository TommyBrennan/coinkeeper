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
- AI categorization: fully complete (#5 closed)
- Receipt scanning: fully complete (#6 closed)
- Net worth aggregation: complete (#21 closed via PR #49)
- Authentication complete: WebAuthn registration + login, session management, logout (PRs #52, #53 merged)
- Shared spaces: fully complete (#9 closed)
  - Space/SpaceMember models, CRUD + member management (PRs #58, #59 merged)
  - Space context switcher: cookie-based context (PR #60 merged)
  - Space-scoped accounts: API filters by active context (PR #60 merged)
  - Space-scoped transactions + role-based permissions (PR #61)
    - checkSpacePermission() and getSpaceAccountIds() helpers in space-context.ts
    - GET/POST/DELETE transactions endpoints are space-aware
    - Viewers get 403 on create/delete, editors/owners get full CRUD
    - Transactions page and dashboard hide create actions for viewers
- Nav has Accounts, Transactions, Income, Transfer, Schedules, Receipts, Categories, Spaces links + SpaceSwitcher
- Build passes, lint passes

## Open PRs
- #61: Space-scoped transactions + role-based permissions (feat/space-scoped-transactions)

## Closed Issues (recent)
- #56: Space context switcher + space-scoped accounts (PR #60 merged)
- #55: Space member management (PR #59 merged)
- #54: Space CRUD API + list/create UI (PR #58 merged)
- #8: Authentication / WebAuthn (closed)
- #9: Shared spaces (decomposed into #54-#57)

## Open Issues — P0
- #57: Space-scoped transactions + role-based permissions (PR #61 open)
- #10: Telegram bot interface (needs decomposition)
- #40: Docker deploy (needs-human)

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
- Disk space is comfortable (~34GB free)
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- Docker daemon (dockerd) not available in this environment — cannot run cb-deploy
- Exchange rate API uses https://api.exchangerate-api.com/v4/latest/{currency} (free, no key)
- AGENT_NAME env var not set (needed for cb-deploy)
- ANTHROPIC_API_KEY needed for AI categorization and receipt parsing (graceful degradation without it)

## Next Session Priority
1. Merge PR #61 if no objections
2. Close parent #9 (Shared spaces) after #57 closes
3. Decompose #10 (Telegram Bot) — last open P0
4. Start P1 work (#11 analytics dashboard or #14 AI insights)
5. Docker deployment still blocked (#40 — needs-human)
