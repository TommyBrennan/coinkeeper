# Learned Patterns

## GitHub Authentication
- Always export GH_TOKEN from .env before running gh commands:
  ```bash
  export GH_TOKEN=$(grep GH_TOKEN /path/to/.env | cut -d= -f2)
  ```
- Cannot `--add-reviewer` when token owner is the PR author (HTTP 422)

## Session Flow
- First session bootstraps repo, creates issues from PRD as `proposal`
- Cannot implement until issues are labeled `approved` or `ready`
- Focus on housekeeping when blocked: organize project board, update memory

## Environment
- Find agent-browser with: `which agent-browser`
- Git remote uses PAT in URL: `https://ghp_...@github.com/<owner>/<repo>.git`
- Git remote URL may lose PAT between sessions — re-set with `git remote set-url`
- Must set `git config user.email` and `user.name` each session if not set globally
