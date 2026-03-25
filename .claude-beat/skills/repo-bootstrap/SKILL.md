---
name: repo-bootstrap
description: This skill should be used when starting a new project from scratch — setting up the GitHub repository, linking a project board, and establishing the initial codebase so all future sessions have a remote to push to.
---

# Repository Bootstrap

At the start of the very first session, check if `REPOSITORY.md` exists in the project root.

If it does NOT exist:

1. Determine a repo name from `.claude-beat/PRD.md` (kebab-case, lowercase)
2. Create a **private** GitHub repository: `gh repo create <name> --private --description "<from PRD>"`
3. Create a **private** GitHub Project linked to the repo
4. Initialize git in the project directory, add remote, push initial commit
5. Create `REPOSITORY.md` in the project root with:

```markdown
# Repository

- **GitHub repo**: https://github.com/<owner>/<name>
- **GitHub Project**: <project URL>
- **Visibility**: private
- **Created**: <date>
```

6. All subsequent pushes go to this repo. All issues and PRs are created there.
