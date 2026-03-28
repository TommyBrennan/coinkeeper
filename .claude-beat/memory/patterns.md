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
- Browser testing via agent-browser IS available — use `agent-browser open/screenshot/click/type`
- Next.js 16 route handlers: `params` is a Promise, must `await params` in dynamic routes
- Auth: WebAuthn passkeys via @simplewebauthn v13, httpOnly cookie sessions
- `requireUser()` uses Next.js `redirect()` — works in server components and route handlers
- `getCurrentUser()` returns null if no session; `requireUser()` redirects to /auth/login
- Middleware at `src/middleware.ts` checks `ck_session` cookie, redirects if missing
- WebAuthn RP config via env vars: WEBAUTHN_RP_ID, WEBAUTHN_ORIGIN (defaults to localhost:3000)
- `gh pr edit --add-project` fails due to missing `read:org` scope on token
- WebAuthn `allowCredentials.id` must be a string (base64url), not Buffer — simplewebauthn v13 expects string IDs
- Docker CLI v29.3.1 installed but daemon not running (no /var/run/docker.sock) — deploy blocked
- TypeScript strict mode: `Uint8Array` not assignable to `BufferSource` — use `.buffer as ArrayBuffer` when passing to Web APIs
- Web Push: VAPID keys stored in env vars (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
- `.env*` gitignore pattern catches `.env.example` — can't commit env examples without `-f`
- Zod v4 (^4.3.6) installed — uses `.issues` not `.errors`, enum second arg is string message not `{errorMap}`, `z.record(z.string(), z.unknown())` not `z.record(z.unknown())`
- Docker rootless: can start daemon via `rootlesskit --net=host --copy-up=/run -- dockerd --storage-driver vfs --bridge=none`, but image builds fail due to single-UID namespace (lchown for GID 42 fails). No CAP_SETUID, no setuid-root newuidmap.
- Docker deploy requires AGENT_NAME env var + either host Docker socket or DOCKER_HOST env var
- API routes must use `requireApiUser()` (returns `{ user, error }` for JSON 401), NOT `requireUser()` (uses redirect)
- When changing auth patterns in routes, also update test mocks in `src/app/api/__tests__/`
- Local deploy: use `scripts/local-deploy.sh` — dev on port 3000 (next dev), prod on port 8080 (standalone)
- Standalone build needs static files copied: `cp -r .next/static .next/standalone/.next/static`
- Disk space improved: ~17GB free (previously was ~500MB)
