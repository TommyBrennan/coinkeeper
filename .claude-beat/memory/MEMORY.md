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
  - API endpoint with Claude integration (PR #39 merged)
  - Auto-suggest in transaction form with debounce + suggestion chip (PR #41 merged)
  - Category normalization: alias mapping (60+ aliases), fuzzy matching, title-case (PR #42 merged)
  - Category management page: rename, delete, merge categories
  - AI correction feedback: stores user overrides, feeds into future prompts
  - CategoryCorrection Prisma model added
- Receipt scanning: fully complete (#6 closed)
  - Backend API: upload, parse, re-parse, CRUD (PR #46 merged)
  - Upload UI: drag-and-drop, parsed data review, batch transaction creation (PR #47 merged)
  - History page: receipt list with thumbnails, detail view with linked transactions (PR #48 merged)
  - Receipt parser library at `src/lib/receipt-parser.ts`
  - Transaction API now accepts `receiptId` for linking
- Net worth aggregation: complete (#21 closed via PR #49)
  - API endpoint at `/api/net-worth` with currency conversion
  - NetWorthSummary client component with base currency selector
  - Currency breakdown toggle with exchange rates
  - Base currency stored in localStorage
- Next.js standalone output enabled for Docker builds
- Dockerfile and .dockerignore committed
- Shared exchange rate utility at `src/lib/exchange-rate.ts`
- Core execution logic at `src/lib/execute-scheduled-transfer.ts`
- AI categorization at `src/lib/categorize.ts`
- Category normalization at `src/lib/category-normalize.ts`
- Authentication complete: WebAuthn registration + login, session management, logout (PRs #52, #53 merged)
- Shared spaces: Space/SpaceMember models in schema, CRUD + member management complete
  - `/spaces` list, `/spaces/new` create, `/spaces/[id]` detail, `/spaces/[id]/edit` rename
  - DeleteSpaceButton component with owner-only protection
  - Member management: invite by email, change roles, remove members (PR #59 merged)
  - InviteMemberForm, MemberActions client components
  - Sole-owner protections: cannot demote/remove last owner
  - Space context switcher: SpaceSwitcher dropdown in nav, cookie-based context (PR #60)
  - Space-scoped accounts: API filters by active context, role-based create permissions
  - `src/lib/space-context.ts` — getSpaceContext(), setSpaceContext()
  - `POST /api/space-context` — sets active space cookie
  - Dashboard and accounts page are space-aware
- Nav has Accounts, Transactions, Income, Transfer, Schedules, Receipts, Categories, Spaces links + SpaceSwitcher
- 16 default categories auto-seeded (11 expense + 5 income + Other)
- Build passes, lint passes

## Open PRs
- #60: Space context switcher + space-scoped accounts (feat/space-context-switcher)

## Closed Issues (recent)
- #55: Space member management (PR #59 merged)
- #56: Space context switcher + space-scoped accounts (PR #60)
- #54: Space CRUD API + list/create UI (PR #58 merged)
- #7: Web interface / dashboard (closed — functional)
- #8: Authentication / WebAuthn (closed — registration + login + session complete)
- #9: Shared spaces (decomposed into #54-#57)
- #51: Auth login + nav integration (PR #53 merged)
- #50: Auth registration (PR #52 merged)
- #21: Net worth aggregation (PR #49 merged)
- (earlier issues — see git log)

## Open Issues — P0
- #57: Space-scoped transactions + role-based permissions
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
- agent-browser not available (no Chromium on ARM64)
- AGENT_NAME env var not set (needed for cb-deploy)
- GitHub token lacks read:org scope (can't add to project board via gh CLI)
- ANTHROPIC_API_KEY needed for AI categorization and receipt parsing (graceful degradation without it)

## Next Session Priority
1. Merge PR #60 if no objections
2. Pick up #57 (Space-scoped transactions + role-based permissions)
3. After #57, close parent #9 (Shared spaces)
4. Decompose #10 (Telegram Bot)
5. Docker deployment still blocked (#40 — needs-human)
