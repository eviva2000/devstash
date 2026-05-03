# Copilot Instructions for devstash

#DevStash a developer knowledge hub for snippets, commands,prompts, notes, images and images.

## Context files
Read the following to get thefull context of the project before writing any code. This will help you understand the architecture, conventions, and critical notes about Next.js 16 that are relevant to this repository.
- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

### Commands
- **Development**: `npm run dev` - Start Next.js dev server at http://localhost:3000 (hot reload enabled)
- **Build**: `npm run build` - Production build to `.next/`
- **Start**: `npm run start` - Run production server
- **Lint**: `eslint` - Check code style with ESLint

### Tech Stack
- **Next.js 16.2.4** - App Router (not Pages Router)
- **React 19.2.4**
- **TypeScript 5** - All code must be typed
- **Tailwind CSS 4** - Styling via utility classes
- **ESLint 9** - Core Web Vitals + TypeScript rules

## Critical Notes on Next.js 16

This repository uses **Next.js 16.2.4**, which has breaking changes from earlier versions. Refer to `/node_modules/next/dist/docs/` before writing new code. Key differences:
- Routes defined in `src/app/` directory (App Router only)
- Server Components are default (wrap with `"use client"` for client components)
- Layout nesting follows directory structure in `src/app/`

## Project Structure

```
src/app/              # Next.js App Router (routes + layouts)
  layout.tsx         # Root layout with font configuration
  page.tsx           # Home page component
  globals.css        # Global Tailwind import
public/              # Static assets (favicon, robots.txt, etc.)
```

## Architecture & Conventions

### Import Paths
- Use path alias `@/*` to import from `src/` (e.g., `import { Button } from '@/components/Button'`)
- TypeScript configured in `tsconfig.json` with `"@/*": ["./src/*"]`

### Styling
- **Tailwind CSS only** - No custom CSS outside `globals.css`
- Font variables (`--font-geist-sans`, `--font-geist-mono`) configured in `layout.tsx` and applied to `<html>` tag
- Global styles in `globals.css` must be Tailwind-only (`@import "tailwindcss"`)

### Component Structure
- All components in `src/` use ES module syntax (`export default` or named exports)
- Client-side interactivity requires `"use client"` directive
- Server Components handle data fetching and layout logic by default

### Type Safety
- `strict: true` in TypeScript config - all code must be properly typed
- Use `React.ReactNode` for component children type annotation
- Use `Readonly<{...}>` for component props when appropriate (as seen in `layout.tsx`)

## ESLint Configuration

The project uses Next.js ESLint config extending:
- `eslint-config-next/core-web-vitals` - Performance/SEO/UX rules
- `eslint-config-next/typescript` - TypeScript linting

Run `eslint` before committing. Ignored directories:
- `.next/`, `out/`, `build/`, `next-env.d.ts`

## Metadata & Fonts

- Root metadata defined in `layout.tsx` as `Metadata` export
- Fonts imported from `next/font/google` (Geist Sans/Mono)
- Font CSS variables injected via `layout.tsx` className props and consumed in Tailwind

## When Adding Features

1. New pages: Create `.tsx` file in `src/app/[route]/page.tsx`
2. New layouts: Create `layout.tsx` in route directory (auto-wraps nested pages)
3. New components: Create in `src/components/` and import via `@/components/`
4. Server vs Client: Default to Server Components; add `"use client"` only when needed
5. Styling: Use Tailwind utility classes in `className` props
6. Always run `npm run lint` to validate before committing
