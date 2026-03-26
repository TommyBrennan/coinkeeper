# Patterns & Learnings

## Recharts TypeScript
- Tooltip `formatter` prop types are strict — use `(value) => ...` without explicit type annotation and cast with `Number(value)` instead of `(value: number) => ...`
- Same pattern applies to `labelFormatter` — use `(label) => ...` and cast as needed

## Analytics Page Structure
- Analytics page at `/analytics` hosts multiple chart sections vertically
- Each section is a self-contained client component with its own data fetching, loading skeleton, and empty state
- Shared pattern: PeriodSelector component for date range filtering
- All analytics APIs are space-aware via `getSpaceContext()` + `getSpaceAccountIds()`

## API Conventions
- Analytics endpoints under `/api/analytics/`
- Support query params: `from`, `to`, `accountId`
- Return `currency` field based on most common transaction currency
- Return structured data arrays sorted chronologically

## Build Verification
- Always run `npm run lint` then `npm run build` before committing
- Build catches TypeScript errors that lint misses
