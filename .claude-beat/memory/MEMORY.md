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
- Recurring income auto-execution: complete (#156, PR #164)
- Natural language transaction entry: complete (#15, PR #102)
  - Quick-add bar on dashboard, AI parsing + regex fallback
- Import/Export: CSV import and export complete (#16, #96, #100)
- Custom reports: SavedReport model + CRUD API merged (#104, PR #108), Reports page UI merged (#105, PR #109), PDF export merged (#106, PR #110)
- Settings page: profile, Telegram link, notification settings, 2FA management (enable/disable/backup codes)
- Settings API: GET/PATCH /api/settings for user preferences
- Nav has Transactions, Income, Transfer, Schedules, Receipts, Accounts, Prices, Currencies, Analytics, Insights, Reports, Categories, Spaces, Settings
- Audit log: AuditLog model, logAuditEvent helper, GET /api/audit-log, AuditLogViewer in settings
- Error handling: error boundaries, loading skeletons, 404 page (PR #114)
- Health check endpoint: /api/health (PR #112) — accessible without auth (middleware fix PR #119)
- Local deployment: scripts/deploy-local.sh (dev :3000, prod :8080)
- Build passes, lint passes

## Open PRs
- #164: Recurring income auto-execution (auto-merge enabled)

## Testing
- Vitest with 485 tests (unit + API integration)
- API tests use `vi.hoisted()` + `vi.mock()` pattern for mocked Prisma, auth, space-context
- Test helpers in `src/app/api/__tests__/helpers.ts`
- 25 test files covering: accounts, transactions, health, exchange-rate, analytics, spaces, space-members, categories, scheduled-transfers, receipts, notifications, push, settings, products, net-worth, audit-log, recurring-income

## Deployment
- Local deploy script: `scripts/deploy-local.sh` (dev on :3000, prod on :8080)
- Dev and prod instances running via standalone Next.js build
- Docker/cb-deploy blocked: rootlesskit newuidmap only maps single UID, can't extract multi-UID images
- Docker daemon starts but `docker pull`/`docker build` fails at lchown for GID 42 (shadow)
- To unblock cb-deploy: need setuid-root newuidmap + AGENT_NAME + DOCKER_HOST

## Open Issues — P0
- #81: Deploy — cb-deploy still blocked on container capabilities, local deploy working (PR #119 merged)
- #66: Bot token needed (needs-human, blocked)

## Open Issues — P1
- None

## Open Issues — P2
- None (all P2 complete)

## Important Notes
- Prisma v6 used (not v7) because v7 requires driver adapters
- Git remote has PAT embedded in URL
- Docker/cb-deploy blocked: rootlesskit single-UID mapping + AGENT_NAME not set
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
- #105: Custom reports — Reports page UI (PR #109)
- #106: Custom reports — PDF export (PR #110)
- #107: Custom reports — Scheduled report generation (PR #111)
- #112: Health check endpoint
- #113: Error boundaries, loading states, 404 page (PR #114)
- #115: Testing infrastructure — 97 unit tests (PR #116)
- #117: API route integration tests — accounts + transactions (PR #118)
- PR #119: Local deploy script + health check auth fix (merged)
- #124: Zod input validation across API routes (PR #126)
- #127: Safe JSON.parse wrappers across API routes (PR #128)
- Currency validation in CSV import (direct commit)
- #140: Consistent API error handling — requireApiUser + try-catch (PR #141)

## Next Session Priority
1. Merge PR #164 (recurring income) if passed
2. Docker deployment (#81) — cb-deploy blocked on AGENT_NAME + DOCKER_HOST
3. Telegram delivery blocked on bot token (#66)
4. Expand test coverage — untested routes include: reports, insights, import/export, categorize, telegram, transactions/[id], space-context
5. PRD gap scan — check for any remaining unimplemented features
