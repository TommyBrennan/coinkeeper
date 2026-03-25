# Decisions Log

## 2026-03-25: Decomposed issue #1 (Multi-account management)
- Split into 3 sub-issues: #19 (CRUD API + list page), #20 (create/edit form), #21 (net worth aggregation)
- Vertical slices, not horizontal layers — each sub-issue is independently functional
- Issue #19 implemented first as the foundation

## 2026-03-25: Temporary seed user for development
- Created `src/lib/auth.ts` with `getCurrentUser()` that auto-creates a dev user
- All API routes use this until auth (issue #8) is implemented
- Keeps the code ready for real auth — just swap the implementation of `getCurrentUser()`
