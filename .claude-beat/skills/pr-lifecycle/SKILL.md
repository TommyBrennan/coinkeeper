---
name: pr-lifecycle
description: This skill should be used when code changes are ready and need to go through the pull request workflow — from pre-flight validation to opening, reviewing, and merging.
---

# Pull Request Lifecycle

## Opening a PR

Before opening a PR, always run in the project directory:

1. **Linter**: `npm run lint` (fix all errors before committing — warnings are ok)
2. **Tests**: `npm test -- --passWithNoTests` (if test suite exists)
3. **Build check**: `npm run build` (must succeed with no errors)

If any of these fail, fix the issues before creating the PR. Do not open a PR with a broken build or lint errors.

When opening a PR:
1. Always request a review from the repo owner
2. Add the PR to the GitHub Project board
3. Set the PR status to "In Review" in the project
4. Include a "Tools & Skills Used" section in the PR body listing every tool and skill used during implementation

## Merging a PR

A PR is ready to merge when it is approved (review state = `APPROVED`) OR when you opened the PR yourself and ALL of these are true:

- lint passed
- tests passed
- build succeeded
- `agent-browser` testing confirmed the feature works
- PR has been open for at least 1 session with no objections

Merge procedure:

1. `gh pr merge <number> --squash --delete-branch`
2. Close the linked issue if not auto-closed
3. Update the GitHub Project board — move the issue/PR to "Done"
4. Note the merge in the session log
