# Stripe Integration Phase 1 - Core Infrastructure

## Overview

Build the server-side foundation for DevStash Pro subscriptions without
exposing Checkout or changing the product UI yet. This phase installs and
configures Stripe, persists the billing snapshot and webhook idempotency
ledger, and establishes one reusable policy for Pro entitlements and Free-tier
usage limits.

DevStash Pro costs **€7/month** or **€72/year**. A user has Pro access only when
their local billing state is `PRO + ACTIVE`. `PAST_DUE`, `CANCELED`, missing
users, and every Free-plan state receive Free access.

## Requirements

### Stripe package and configuration

- Install the current stable `stripe` server SDK and commit the lockfile.
- Do not install `@stripe/stripe-js`; hosted Checkout does not require it.
- Add a lazy, server-only Stripe client in `src/lib/stripe/client.ts`.
- Add server-only configuration helpers in `src/lib/stripe/config.ts`.
- Map the trusted interval values `monthly` and `yearly` to
  `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY`.
- Validate the canonical `APP_URL`, Price IDs, secret key, and webhook secret
  at the boundary that needs each value. Loading Checkout configuration must
  not require the webhook secret.
- Never accept a Price ID, amount, currency, Customer ID, user ID, plan, or
  subscription status from the browser.
- Keep these documented in `.env.example`:

  ```dotenv
  APP_URL="http://localhost:3000"
  STRIPE_SECRET_KEY=""
  STRIPE_WEBHOOK_SECRET=""
  STRIPE_PRICE_ID_MONTHLY=""
  STRIPE_PRICE_ID_YEARLY=""
  ```

- Remove `STRIPE_PUBLISHABLE_KEY` or explicitly mark it unused until Stripe.js
  is introduced. Never expose `STRIPE_SECRET_KEY`.

### Billing data model

- Retain the existing `User.plan`, `User.subscriptionStatus`,
  `User.stripeCustomerId`, and `User.stripeSubscriptionId` fields.
- Do not add an `isPro` boolean or billing claims to the Auth.js JWT/session.
- Add mapped snake_case fields to `User` for:
  - subscribed Stripe Price ID;
  - raw Stripe subscription status;
  - current billing-period end;
  - cancellation scheduled for period end;
  - last Stripe event creation timestamp used as a defensive sync cursor.
- Add a `StripeWebhookEvent` model keyed by Stripe `event.id`, with event type,
  related object ID, Stripe creation time, and processed time.
- Add an index for event type and related object ID.
- Create and review a Prisma migration against the Neon `development` branch
  only. Do not touch the `production` branch.

### Usage limits and entitlements

- Create `src/lib/usage-limits.ts` as a pure policy module with:
  - `FREE_ITEM_LIMIT = 50`;
  - `FREE_COLLECTION_LIMIT = 3`;
  - a typed function that derives entitlements from `plan` and
    `subscriptionStatus`;
  - `hasActivePro`, `canUseAi`, `canUploadDocuments`,
    `canManageCustomTypes`, and `canExport` flags;
  - `itemLimit` and `collectionLimit`, using `null` to mean unlimited.
- Only `PRO + ACTIVE` receives active Pro entitlements and unlimited item and
  collection limits.
- Create `src/lib/billing/entitlements.ts` as the database-backed entry point.
  It must select only the authenticated user's current `plan` and
  `subscriptionStatus`, then delegate policy decisions to
  `src/lib/usage-limits.ts`.
- Add a reusable active-Pro guard that can be mapped to typed action or route
  errors in Phase 2.
- Keep the policy centralized. Feature modules must not introduce independent
  checks such as `plan === "PRO"`.

## Unit Tests

Create `src/lib/usage-limits.test.ts` with table-driven Vitest coverage for:

- `FREE + INACTIVE` returning 50 items, 3 collections, and no paid features;
- `PRO + ACTIVE` returning `null` limits and all paid entitlements;
- `PRO + PAST_DUE` receiving Free limits and no paid entitlements;
- canceled, inactive, unexpected plan/status combinations, and a missing user
  failing closed to Free access;
- the exported Free limits remaining exactly 50 items and 3 collections;
- unlimited limits being represented by `null`, never `Infinity`.

Also add focused tests for:

- valid monthly/yearly Price mapping;
- missing or malformed configuration;
- configuration helpers requiring only the variables used by that boundary;
- lazy Stripe client behavior without importing secrets into client code;
- the database-backed entitlement helper selecting current database state and
  delegating to the pure usage-limits policy.

## Out of Scope

- Checkout, Customer Portal, and post-checkout reconciliation actions;
- Stripe Customer creation;
- subscription synchronization and status mapping;
- the webhook route and event processing;
- enforcing limits or Pro gates in existing actions/routes;
- billing, pricing, upgrade, and usage-limit UI;
- Stripe CLI and Sandbox lifecycle testing.

These belong to Phase 2.

## Acceptance Criteria

- The Stripe server SDK, environment contract, and lazy client are ready for
  integration code.
- The development migration contains the billing snapshot and idempotency
  ledger without adding `isPro`.
- Auth.js remains identity-only.
- Every plan/status combination has one deterministic entitlement result.
- `src/lib/usage-limits.test.ts` passes and proves strict `PRO + ACTIVE`
  authorization plus the 50-item and 3-collection Free limits.
- Existing unit tests, lint, and the production build pass.

## References

- @docs/stripe-integration-plan.md
- @context/project-overview.md
- @prisma/schema.prisma
- @src/auth.ts
- @src/lib/ai/access.ts
- @context/features/stripe-phase-2-spec.md
