# Homepage Spec

## Overview

Replace the placeholder `/` page with the production DevStash marketing homepage. Recreate the approved direction in `@prototypes/homepage/` as a maintainable Next.js implementation using the project’s Tailwind CSS and shadcn/ui conventions.

The page is public and must not fetch user or database data.

## Requirements

- Build the homepage at `src/app/page.tsx` with dark DevStash styling, matching the prototype’s layout and content direction.
- Keep `page.tsx` and static section components as Server Components. Create small Client Components only for browser interactions:
  - mobile navigation menu;
  - chaos-icon animation and pointer repulsion;
  - monthly/yearly pricing toggle;
  - scroll-reveal behavior, if CSS alone is insufficient.
- Do not make the whole page a Client Component. Keep animation state and event listeners isolated to their relevant component.
- Add focused homepage components under `src/components/homepage/`. Keep shared, reusable primitives in `src/components/ui/`; do not duplicate shadcn Button, Badge, or other existing UI patterns.
- Use Tailwind utility classes, the project’s existing fonts/theme tokens, and `lucide-react` icons where appropriate. Avoid copying the prototype’s standalone CSS or inline SVG assets directly.
- Keep the implementation clean and DRY: use data arrays for feature cards, pricing benefits, and footer links; share section and card patterns where practical.

## Page Content

- Fixed navigation with DevStash logo, in-page links to Features, Pro AI, and Pricing, plus working links to `/sign-in` and `/register`.
- Minimal hero copy: “Developer knowledge, organized.”, a short supporting line, and a primary `/register` CTA.
- Chaos-to-order visual with bold Problem and Solution panels:
  - eight large monochrome developer-tool icons that drift continuously, bounce within their panel, react to pointer hover, and respect `prefers-reduced-motion`;
  - pulsing transform arrow;
  - ordered dashboard preview with item-type-colored card borders.
- Six feature cards: Code Snippets, AI Prompts, Instant Search, Commands, Files & Docs, and Collections. Use the established item-type accent colors.
- Pro AI section with capability list and an editor mockup showing AI-generated tags.
- Free and Pro pricing cards. The Pro card is highlighted; the toggle switches between $8 monthly and $72 yearly ($6/month equivalent) without changing routes.
- Final `/register` CTA and footer navigation. Use the current year dynamically; footer links should point to real routes/anchors only, or be omitted until their destination exists.

## Responsive and Accessible Behavior

- Match the prototype’s responsive hierarchy: stack the hero panels and rotate the arrow on mobile; use single-column feature and pricing layouts on narrow screens.
- Provide semantic landmarks, headings, button/link labels, visible focus styles, and a skip link.
- Honor reduced-motion preferences by disabling non-essential animation while retaining readable content and layout.

## References

- `@prototypes/homepage/index.html`
- `@prototypes/homepage/styles.css`
- `@prototypes/homepage/script.js`
- `@src/app/globals.css`
- `@src/components/ui/button.tsx`

## Verification

- Run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`.
- Verify desktop and mobile homepage layout, mobile navigation, pricing toggle, CTA destinations, and reduced-motion behavior in a browser.
