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
