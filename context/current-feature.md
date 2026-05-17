# Current Feature

## Status

<!-- Not Started | Inprogress | Completed -->
Inprogress

## Goals

- Implement Prisma + Neon PostgreSQL setup from `context/features/database-spec.md`.
- Add Prisma ORM using Prisma 7 conventions.
- Create the initial schema from the data models in `context/project-overview.md`.
- Include NextAuth models: Account, Session, and VerificationToken.
- Add appropriate indexes and cascade deletes.
- Use migrations for database changes; do not push schema directly unless explicitly requested.

## Notes

- Source spec: `context/features/database-spec.md`
- Product/data model reference: `context/project-overview.md`
- Database target: Neon PostgreSQL serverless.
- Development and production use separate Neon branches; `DATABASE_URL` should point at the development branch while implementing.
- Prisma 7 has breaking changes. Read the full Prisma 7 upgrade guide before implementation: `https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7`
- Also reference the Prisma setup guide: `https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres`
- Follow `AGENTS.md`: read relevant installed Next.js docs under `node_modules/next/dist/docs/` before changing app code.

## History

Keep this updated. Earliest to Latest

- **Initial Next.js Setup** (May 3, 2026)
  - Created Next.js 16.2.4 project with App Router
  - Configured TypeScript 5 with strict mode
  - Integrated Tailwind CSS 4 for styling
  - Set up ESLint 9 with Next.js core-web-vitals rules
  - Configured Geist Sans/Mono fonts via next/font/google
  - Established path alias `@/*` for src/ imports
  - Root layout and home page created in `src/app/`
  - Development environment ready at http://localhost:3000
- **Dashboard UI Phase 1** (May 4, 2026)
  - Initialized shadcn/ui for the existing Next.js App Router and Tailwind CSS 4 setup
  - Installed the Button and Input components used by the dashboard top bar
  - Added `/dashboard` with a dark dashboard shell, sidebar placeholder, top bar search, New Item button, and main placeholder
  - Updated root metadata and enabled dark mode by default at the document level
  - Verified with `npm run lint` and `npm run build`
- **Dashboard UI Phase 3** (May 15, 2026)
  - Completed on branch `codex-dashboard-phase-3`
  - Scope defined from `context/features/dashboard-phase-3-spec.md`
  - Added the main dashboard area with top stats, recent collections, pinned items, and recent items from mock data
  - Added a right-side item content drawer with smooth open and close transitions
  - Split the dashboard shell into focused dashboard components and moved dashboard data, types, and utilities into `src/features/dashboard/`
  - Verified with `npm run lint`, `npm run build`, and a browser smoke test for the item drawer
