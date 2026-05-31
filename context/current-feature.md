# Current Feature

## Status

<!-- Not Started | Inprogress | Completed -->
Completed

## Goals

- No active feature

## Notes

- No active notes

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
- **Database Setup** (May 17, 2026)
  - Added Prisma 7 with Neon PostgreSQL support using `@prisma/adapter-pg`
  - Created the initial schema for users, accounts, sessions, verification tokens, items, item types, collections, tags, and item-tag relationships
  - Added indexes, unique constraints, and cascade/restrict/set-null delete behavior for the core data model
  - Added the initial Prisma migration, generated Prisma client output, database seed script, database smoke test script, and shared Prisma client helper
- **Dashboard Collections Database Integration** (May 31, 2026)
  - Replaced dummy dashboard collection data with real collection data from the Neon database through Prisma
  - Displayed the 6 most recent collections with real stats and type information
  - Derived each collection card border color from the collection's most-used content type
  - Added compact type icons to each collection card for all represented content types
