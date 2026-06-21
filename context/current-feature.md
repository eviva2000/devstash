# Current Feature: Dashboard Favorite Collections Quick Win

## Status

<!-- Not Started | In Progress | Complete -->
In Progress

## Goals

- Fix the low-risk dashboard sidebar favorite collections issue found by the code scan.
- Fetch favorite collections with the existing `getFavoriteCollections()` helper instead of deriving them from only the recent collections slice.
- Pass the server-fetched `favoriteCollections` prop through `DashboardShellClient` instead of recomputing favorites from recent collections.
- Remove the unused `pluralTypeSlugs` variable in `src/features/dashboard/dashboard-utils.ts`.
- Add a dashboard route error boundary for load/render failures.
- Add a dashboard route loading state using the ShadCN-style Skeleton UI component.
- Validate database query limits before passing them to Prisma `take`.
- Add a database-level partial unique index that prevents duplicate system item type slugs.
- Preserve the existing dashboard UI contract and avoid authentication work.

## Notes

- Current issue: `DashboardShell` fetches recent collections but never calls `getFavoriteCollections()`, then filters `recentCollections` to build `favoriteCollections`.
- Client issue: `DashboardShellClient` declares a `favoriteCollections` prop but does not destructure or use it, then recomputes favorites from recent collections.
- User-visible impact: favorite collections that are not also in the latest recent collections slice can disappear from the sidebar.
- Add `src/app/dashboard/error.tsx` so dashboard failures show a recoverable fallback instead of a blank or misleading state.
- Add `src/app/dashboard/loading.tsx` with skeletons that mirror the dashboard shell while server data loads.
- Validate limit arguments for recent collections, favorite collections, and recent items to reject invalid or excessive values before querying.
- Prisma cannot express PostgreSQL partial indexes in the schema, so system item type slug uniqueness is enforced through a custom SQL migration.
- This is a quick win because the database helper already exists and the fix should be isolated to dashboard data wiring.
- Do not include authentication work in this feature; authentication has not been implemented yet.

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
- **Seed Data Feature** (May 19, 2026)
  - Completed on branch `seed-data-feature`
  - Replaced `prisma/seed.ts` with spec-compliant demo data for `demo@devstash.io`
  - Added bcryptjs password hashing with 12 rounds for the demo password
  - Seeded 7 system item types with Lucide icon names and hex colors
  - Seeded 5 collections and 18 representative snippets, prompts, commands, and links
  - Added `npm run db:seed` for direct seed execution
  - Updated `scripts/test-db.ts` to fetch and validate the demo user, password hash, system item types, collections, items, and link URLs
  - Verified with `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run db:seed`, and `npm run db:test`
- **Dashboard Collections Database Integration** (May 31, 2026)
  - Replaced dummy dashboard collection data with real collection data from the Neon database through Prisma
  - Displayed the 6 most recent collections with real stats and type information
  - Derived each collection card border color from the collection's most-used content type
  - Added compact type icons to each collection card for all represented content types
- **Dashboard Items Database Integration** (May 31, 2026)
  - Completed on branch `item-types-to-database`
  - Replaced dashboard pinned and recent item mock data with Neon database data through Prisma
  - Added `src/lib/db/items.ts` with item fetching, item stats, and item type count helpers
  - Fetched dashboard item data in the server component and passed database-backed items into the client dashboard
  - Derived item card icons and borders from database item type metadata, including hex color support
  - Hid the pinned items section when no pinned items exist
  - Verified with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a browser smoke test
  - **Stats and Sidebar Database Integration** (May 31, 2026)
  - Completed on branch `stats`
  - Replaced dashboard stat values with database-backed item and collection counts
  - Displayed system item types in the sidebar with database-backed counts, icons, and `/items/[typename]` links
  - Switched sidebar favorite and recent collections to actual database collection data
  - Added a `View all collections` sidebar link to `/collections`
  - Rendered recent sidebar collections with colored circles based on each collection's most-used item type
  - Added `src/lib/db/items.ts` helpers for item stats and item type counts
- **Add Pro Badge To Sidebar** (June 17, 2026)
  - Completed on branch `pro-badge-sidebar`
  - Added the ShadCN UI Badge component
  - Displayed subtle uppercase `PRO` badges for File and Image sidebar item types
  - Verified with `npm run lint` and `npm run build`
