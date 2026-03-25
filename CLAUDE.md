# CoinKeeper

AI-powered personal finance management with multi-currency support, receipt scanning, and deep spending analytics.

## Tech Stack

- **Frontend:** TypeScript, Next.js 16, React 19, Tailwind CSS v4
- **Backend:** Next.js API routes
- **Database:** SQLite via Prisma ORM v6
- **Auth:** WebAuthn/Passkeys (planned)

## Project Structure

```
src/
  app/           # Next.js App Router pages and layouts
  lib/           # Shared utilities (db.ts, utils.ts)
  components/    # React components
    ui/          # Base UI components
prisma/
  schema.prisma  # Database schema
  migrations/    # Database migrations
```

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate                   # Regenerate client
npx prisma studio                     # Database GUI
```

## Conventions

- Use `cn()` from `@/lib/utils` for class merging
- Use `db` from `@/lib/db` for database access
- Prisma client imports from `@prisma/client`
- All monetary amounts stored as Float (consider Decimal for production)
- SQLite database at `prisma/dev.db` (gitignored)
