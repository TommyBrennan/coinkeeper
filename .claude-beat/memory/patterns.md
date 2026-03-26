# Learned Patterns

## GitHub Authentication
- GH_TOKEN is loaded via gh auth (GH_TOKEN env var)
- Cannot `--add-reviewer` when token owner is the PR author (HTTP 422)

## Session Flow
- First session bootstraps repo, creates issues from PRD as `approved` + `prd`
- PRD features are pre-approved — no proposal step needed

## Environment
- Git remote uses PAT in URL: `https://ghp_...@github.com/TommyBrennan/coinkeeper.git`
- Git remote URL may lose PAT between sessions — re-set with `git remote set-url`
- Git config already set: user.name=TommyBrennan, user.email=tommy.brennan@egbe.dev

## Technical
- Prisma v6 (not v7) — v7 requires driver adapters for SQLite
- Disk space is very limited (~500MB free) — clean npm cache before installs
- Run `rm -rf /home/claude-beat/.npm/_cacache/` before large npm installs
- Prisma client imports from `@prisma/client` (v6 standard)
- Use `npx prisma generate` after schema changes
- Build: `npm run build`, Lint: `npm run lint`
- ARM64 Linux — no Chrome for Testing, no sudo access for apt install
- Browser testing via agent-browser not available (no Chromium installed)
- Next.js 16 route handlers: `params` is a Promise, must `await params` in dynamic routes
- Auth: WebAuthn passkeys via @simplewebauthn v13, httpOnly cookie sessions
- `requireUser()` uses Next.js `redirect()` — works in server components and route handlers
- `getCurrentUser()` returns null if no session; `requireUser()` redirects to /auth/login
- Middleware at `src/middleware.ts` checks `ck_session` cookie, redirects if missing
- WebAuthn RP config via env vars: WEBAUTHN_RP_ID, WEBAUTHN_ORIGIN (defaults to localhost:3000)
- `gh pr edit --add-project` fails due to missing `read:org` scope on token
- WebAuthn `allowCredentials.id` must be a string (base64url), not Buffer — simplewebauthn v13 expects string IDs
- Docker CLI v29.3.1 installed but daemon not running (no /var/run/docker.sock) — deploy blocked
