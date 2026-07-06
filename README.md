# DevStash

DevStash is a centralized developer knowledge hub for the code snippets, AI prompts, notes, commands, files, URLs, and project context developers reuse every day.

The product goal is simple: give developers one fast, searchable, AI-enhanced workspace for storing and organizing reusable technical knowledge instead of scattering it across editors, bookmarks, chat history, gists, local folders, and documentation tools.



## Core Concepts

### Items

An item is the primary unit of saved knowledge. Items can represent:

- Code snippets
- AI prompts
- Markdown notes
- Terminal commands
- Uploaded files
- Images
- URLs or bookmarks
- Project context documents

### Item Types

DevStash includes these built-in item types:

| Type | Purpose |
| --- | --- |
| Snippet | Reusable code blocks |
| Prompt | AI prompts and workflows |
| Note | Markdown notes and explanations |
| Command | CLI commands and scripts |
| File | Uploaded documents and templates |
| Image | Screenshots, diagrams, and visual references |
| URL | Bookmarks and external resources |

Custom item types are planned for Pro users.

### Collections

Collections group related items and can contain mixed item types. Examples include React Patterns, Context Files, Python Snippets, Next.js Boilerplates, Prompt Engineering, and Useful CLI Commands.

### Tags

Tags provide flexible cross-cutting organization across collections and item types, such as `react`, `nextjs`, `auth`, `prisma`, `prompt`, `debugging`, and `performance`.



The app currently includes the root page, custom auth screens, the authenticated dashboard, typed item list pages, profile settings, item detail APIs, upload APIs, and supporting auth/profile endpoints.

## Tech Stack

| Category | Choice |
| --- | --- |
| Framework | Next.js 16 with App Router |
| UI Runtime | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui, Base UI |
| Icons | lucide-react |
| Database | PostgreSQL, intended for Neon |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | NextAuth/Auth.js v5 |
| File Storage | Cloudflare R2 |
| AI | OpenAI `gpt-5-nano` |
| Payments | Stripe |
| Deployment | Vercel |

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to a PostgreSQL connection string:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
```

If Prisma Migrate needs a separate shadow database, also set:

```bash
SHADOW_DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/SHADOW_DB?sslmode=require"
```

Email verification is enabled by default. To disable it for local development
while Resend is not configured for your domain, set:

```bash
EMAIL_VERIFICATION_ENABLED=false
```

Run database migrations:

```bash
npm run db:migrate
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Seed the demo data:

```bash
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the root page or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the current dashboard UI.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests once for server actions, route handlers, and utilities |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with V8 coverage output |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations in development |
| `npm run db:studio` | Open Prisma Studio without launching a browser |
| `npm run db:seed` | Seed the demo user, item types, collections, and items |
| `npm run db:test` | Verify database connectivity and demo seed data |

## Project Structure

```text
src/
  actions/
    items.ts                    Server actions for item create, update, and delete
    items.test.ts               Unit tests for item server actions
  app/
    (auth)/                     Custom auth pages
      forgot-password/
      register/
      reset-password/
      sign-in/
      verify-email/
    api/
      auth/                     Auth.js and auth lifecycle route handlers
      items/[id]/               Item detail API
      items/[id]/download/      Authenticated file download and image preview proxy
      profile/                  Account and password API routes
      uploads/                  Authenticated Cloudflare R2 upload/delete API
    dashboard/                  Authenticated dashboard route, loading, and error UI
    items/[type]/               Typed item list route
    profile/                    Authenticated profile page
    globals.css                 Global Tailwind styles
    layout.tsx                  Root layout and providers
    page.tsx                    Root page
  components/
    auth/                       Auth form components and shared auth shell
    dashboard/                  Dashboard shell, cards, editors, drawer, create dialog, upload UI
    items/                      Typed item list shell components
    profile/                    Profile account action components
    ui/                         shadcn-style UI primitives
    user-avatar.tsx             Shared user avatar component
  features/
    dashboard/                  Dashboard data adapters, types, and utilities
  generated/prisma/             Generated Prisma client output
  lib/
    auth/                       Auth-specific helpers
    db/                         Prisma data access helpers and DB utility tests
    email/                      Resend email integration
    storage/                    Cloudflare R2 storage helpers
    file-uploads.ts             Upload validation and file metadata helpers
    icon-map.ts                 Lucide icon lookup map
    prisma.ts                   Shared Prisma client
    rate-limit.ts               Upstash rate limit helper
    utils.ts                    Shared UI utilities
  types/
    next-auth.d.ts              Auth.js session/JWT type augmentation

prisma/
  schema.prisma                 Database schema
  seed.ts                       Demo data seed script
  migrations/                   Prisma migrations
    20260515143000_init/
    20260621120000_unique_system_item_type_slugs/
    20260706120000_item_upload_records/

context/
  project-overview.md           Product and architecture overview
  current-feature.md            Current feature tracker and implementation history
  coding-standards.md           Project coding conventions
  ai-interaction.md             AI collaboration notes
  features/                     Feature specs
  research/                     Research notes and helper skill
  screenshots/                  Dashboard reference screenshots

scripts/
  delete-non-demo-users.ts      Dry-run-first cleanup helper for non-demo users
  test-db.ts                    Database smoke test
```

## MVP Scope

The MVP is planned around:

- Authentication
- Item CRUD
- Built-in item types
- Collections
- Tags
- Favorites and pinned items
- Markdown editor for text-based items
- Syntax highlighting for snippets and commands
- File and image uploads
- Basic full-text search
- Free tier limits
- Dark mode-first UI

Near-term additions include recently used items, URL metadata extraction, file import, JSON export, and basic AI auto-tagging for Pro users.

## Planned Architecture

```mermaid
graph TD
  Client[Next.js Client] --> AppRouter[Next.js App Router]
  AppRouter --> ServerActions[Server Actions / Route Handlers]
  ServerActions --> Auth[NextAuth / Auth.js]
  ServerActions --> Prisma[Prisma ORM]
  Prisma --> Postgres[(Neon PostgreSQL)]
  ServerActions --> R2[(Cloudflare R2)]
  ServerActions --> OpenAI[OpenAI API]
  ServerActions --> Stripe[Stripe]
  ServerActions --> Redis[(Redis Cache - Optional)]
```

## Documentation

The main product and technical planning documents live in `context/`:

- `context/project-overview.md`
- `context/current-feature.md`
- `context/features/database-spec.md`
- `context/features/dashboard-phase-1-spec.md`
- `context/features/dashboard-phase-2-spec.md`
- `context/features/dashboard-phase-3-spec.md`
- `context/features/item-list-view-spec.md`
- `context/features/item-drawer-spec.md`
- `context/features/item-drawer-edit-spec.md`
- `context/features/item-create-spec.md`
- `context/features/code-editor-spec.md`
- `context/features/markdown-editor-spec.md`
- `context/features/file-image-spec.md`
- `context/features/profile-spec.md`
- `context/features/rate-limiting-spec.md`
