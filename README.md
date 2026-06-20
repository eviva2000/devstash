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



The root route `/` currently renders a minimal DevStash page. The product overview still defines a fuller future route structure, including marketing, auth, app, collections, tags, settings, and billing pages.

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
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations in development |
| `npm run db:studio` | Open Prisma Studio without launching a browser |
| `npm run db:seed` | Seed the demo user, item types, collections, and items |
| `npm run db:test` | Verify database connectivity and demo seed data |

## Project Structure

```text
src/
  app/
    page.tsx                 Root page
    dashboard/               Current dashboard route
  components/ui/             Shared UI primitives
  features/dashboard/        Dashboard data, types, and utilities
  generated/prisma/          Generated Prisma client
  lib/                       Shared helpers

prisma/
  schema.prisma              Database schema
  seed.ts                    Demo data seed script
  migrations/                Prisma migrations

context/
  project-overview.md        Product and architecture overview
  current-feature.md         Implementation history
  features/                  Feature specs
  screenshots/               Dashboard reference screenshots

scripts/
  test-db.ts                 Database smoke test
```

## MVP Scope

The MVP is planned around:

- Authentication
- Item CRUD
- Built-in item types
- Collections
- Tags
- Favorites and pinned items
- Basic full-text search
- Markdown editor for text-based items
- Syntax highlighting for snippets
- Free tier limits
- Dark mode-first UI

Near-term additions include recently used items, file uploads, URL metadata extraction, file import, JSON export, and basic AI auto-tagging for Pro users.

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
