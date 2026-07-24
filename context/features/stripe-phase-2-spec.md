# Stripe Integration Phase 2 - Integration and UI

## Overview

Connect the Phase 1 billing foundation to Stripe-hosted Checkout and the
Customer Portal, synchronize subscription state through signed webhooks, apply
the central entitlement policy to every existing paid feature and Free quota,
and add the billing and upgrade UI.

The signed webhook is the primary source of truth. An authenticated
post-checkout reconciliation action may make the success screen responsive,
but a success URL or browser-supplied value must never grant Pro access.

Before implementing Next.js code, read the relevant Next.js 16.2.4 guides in
`node_modules/next/dist/docs/`, especially the Route Handler, Server Action,
authentication, and environment-variable guides. Follow their current APIs and
deprecation notices.

## Requirements

### Stripe Customer and billing actions

- Implement safe Stripe Customer creation/reuse keyed by the authenticated
  DevStash user ID, never email alone.
- Persist one Stripe Customer ID per user and handle concurrent creation
  without silently losing orphaned Customer records.
- Add authenticated, Zod-validated Server Actions for:
  - `createCheckoutSession({ interval, attemptId })`;
  - `createBillingPortalSession()`;
  - `reconcileCheckoutSession({ sessionId })`.
- Checkout must:
  - accept only `monthly` or `yearly` plus a UUID attempt ID;
  - choose the allowed Price ID and canonical `APP_URL` on the server;
  - reuse the stored Customer;
  - set the authenticated user ID in `client_reference_id` and metadata;
  - use the attempt UUID as Stripe's idempotency key for that exact attempt;
  - reject users with an existing live subscription and direct them to billing
    management;
  - redirect to Stripe-hosted Checkout only after successful creation.
- Create a fresh Customer Portal Session for every click using the Customer ID
  read from the authenticated user's database record.
- Reconciliation must retrieve the Checkout Session from Stripe, verify it
  belongs to the authenticated user, require a real Subscription, and call the
  same canonical synchronization helper as webhooks.
- Keep framework `redirect()` calls outside broad `try/catch` blocks.

### Canonical subscription synchronization

- Centralize Stripe-to-local status and Price mapping in
  `src/lib/stripe/sync-subscription.ts`.
- Retrieve the latest Subscription from Stripe rather than treating event
  payload order as canonical.
- Support the recognized monthly and yearly Prices only. Unknown Prices,
  multiple unexpected recurring items, or unsupported trials must fail closed
  and never grant Pro.
- Store the raw Stripe status, Price, current period end, and
  cancel-at-period-end value.
- Map subscription state as follows:

  | Stripe status | Local plan | Local status | Pro access |
  |---|---|---|---:|
  | `active` | `PRO` | `ACTIVE` | Yes |
  | `past_due` | `PRO` | `PAST_DUE` | No |
  | `unpaid` / `paused` | `PRO` | `PAST_DUE` | No |
  | `canceled` | `FREE` | `CANCELED` | No |
  | `incomplete` / `incomplete_expired` | `FREE` | `INACTIVE` | No |

- No trial is included in this release.
- Extract billing-period and invoice relationships using the installed Stripe
  SDK's current types; do not copy examples for an older API version.

### Signed and idempotent webhooks

- Add the Node.js Route Handler at
  `src/app/api/stripe/webhook/route.ts`.
- Read `request.text()` exactly once before any parsing and verify the
  `stripe-signature` with the configured webhook secret.
- Return 400 for a missing/invalid signature, 500 for retryable processing
  failures, and 2xx only after durable processing.
- Put the explicit event switch in a separately testable
  `src/lib/stripe/process-event.ts`.
- Handle:
  - `checkout.session.completed`;
  - `customer.subscription.created`;
  - `customer.subscription.updated`;
  - `customer.subscription.deleted`;
  - `invoice.paid`;
  - `invoice.payment_failed`.
- Add async Checkout events only if delayed payment methods are enabled.
- Treat unsupported events as successful no-ops.
- Insert the webhook ledger row and update the local user snapshot in one
  transaction. Duplicate `event.id` delivery must be a successful no-op.
- Serialize final state updates per user so concurrent or reversed deliveries
  cannot commit stale state.
- Log event IDs, types, object IDs, user IDs, and outcomes without secrets or
  full payment data.

### Authoritative feature gating

- Replace every plan-only check with the Phase 1 database-backed entitlement
  helper. Do not authorize from JWT claims or client `isPro` props.
- AI actions require active Pro and distinguish `PRO_REQUIRED` from
  `BILLING_PAST_DUE`.
- Enforce the 50-item and 3-collection Free limits inside the database creation
  transaction before the create operation.
- Use serializable transactions with bounded retry or an equivalent per-user
  database lock so concurrent requests cannot create item 51 or collection 4.
- Return typed failures such as `ITEM_LIMIT_REACHED` and
  `COLLECTION_LIMIT_REACHED`; do not overload existing `null` results.
- Keep existing content readable, editable, downloadable, and deletable after
  downgrade. Block only new over-limit or Pro-only operations.
- Keep image uploads up to the agreed Free image limit available to Free users.
  Require active Pro for document/file uploads:
  - before writing to R2; and
  - again when consuming the pending upload during item creation.
- Gate existing custom-type and export mutations if those server surfaces are
  present. Any later implementation must call the same entitlement helper.
- Add pagination/cursor loading where current query caps would otherwise make
  the Pro "unlimited" promise inaccessible.
- Make account deletion subscription-safe: cancel any live subscription before
  deleting the local user, and keep the local account if Stripe cancellation
  fails.

### Billing and upgrade UI

- Extend the server-side profile view model with UI-safe billing state and
  item/collection usage. Do not pass secret Stripe IDs to client components.
- Add `src/components/profile/profile-billing-card.tsx` to `/profile` with:
  - current plan and monthly/yearly interval;
  - active, past-due, canceling, and canceled states;
  - renewal or access-end date;
  - item and collection usage;
  - monthly and annual upgrade buttons for Free users;
  - Manage Billing and payment-recovery actions;
  - pending, success, canceled, and error feedback after Checkout.
- After verified reconciliation, refresh the dynamic profile data so it reads
  current database entitlements.
- Update public pricing to **€7/month** and **€72/year**, with annual savings of
  **€12/year (about 14%)**.
- Preserve the selected billing interval through registration/sign-in, but
  require an explicit click before creating Checkout. Never create a Checkout
  Session as a GET side effect.
- Pass server-derived entitlement and usage data to dashboard create surfaces.
  Disable or explain disallowed actions, show actual counts such as `50 / 50`,
  and provide Upgrade or Manage Billing recovery actions.
- UI gating is explanatory only; every restriction must remain enforced at the
  server/database boundary.
- Ensure billing status, limit errors, and action controls are keyboard and
  screen-reader accessible and prevent double submission.

## Automated Tests

Add focused Vitest coverage for:

- canonical status/Price mapping, including unknown Prices failing closed;
- Customer reuse and concurrent creation behavior;
- Checkout input validation, trusted Price selection, authenticated ownership,
  canonical URLs, idempotency, and duplicate-subscription prevention;
- Portal Customer lookup from the database;
- reconciliation rejecting a Session owned by another user;
- webhook raw-body signature checks, supported/unsupported events, duplicates,
  reversed delivery, provider/database failures, and deleted users;
- Free item creation at 49/50 and collection creation at 2/3;
- concurrent Free creates never exceeding either limit;
- active Pro over both limits and `PAST_DUE`/canceled denial;
- Free image upload, Free document rejection before R2, active-Pro document
  upload, and stale upload-token rejection;
- AI requiring active Pro;
- downgrade preserving existing-data operations;
- account deletion canceling billing before local deletion.

Use `stripe.webhooks.generateTestHeaderString` for signed webhook fixtures.
Follow the project testing standard: keep Vitest in the Node environment and do
not add browser component-test infrastructure solely for this feature.

## Stripe CLI and Sandbox Verification

This phase is not complete with mocked tests alone.

1. Configure the Stripe Sandbox Product and recurring EUR Prices for €7/month
   and €72/year.
2. Start the app with Sandbox keys and Price IDs.
3. Forward real local webhooks:

   ```sh
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Use the `whsec_...` printed by that CLI process locally. It is different
   from the Dashboard endpoint secret.
5. Complete real Sandbox monthly and annual Checkouts and verify the profile,
   dashboard, and database-derived gates update after webhook processing.
6. Verify canceled/abandoned Checkout, delayed webhook versus success redirect,
   payment failure and recovery, cancellation at period end, immediate
   cancellation, Portal interval changes, duplicate resend, reversed delivery,
   two-tab Checkout attempts, and account deletion while subscribed.
7. Use Stripe Test Clocks/Simulations for renewal and recovery scenarios.
   Prefer a real Sandbox subscription over isolated synthetic CLI events when
   end-to-end object correlation matters.
8. Record the tested Stripe SDK/API version and configure the Dashboard
   endpoint to that version.

## Acceptance Criteria

- Signed webhooks and authenticated retrieval from Stripe are the only paths
  that can grant Pro.
- Duplicate, concurrent, and out-of-order events converge on canonical Stripe
  state.
- Checkout and Portal accept no browser-controlled Stripe identifiers.
- All existing paid features and Free quotas have authoritative server gates.
- Free creation remains within 50 items and 3 collections under concurrency.
- Downgrade never destroys or hides existing user content.
- `/profile`, pricing, and dashboard UI accurately explain plan, billing,
  limits, and recovery actions without exposing secret Stripe IDs.
- Account deletion cannot leave an untracked recurring subscription.
- Automated tests pass, and the monthly/annual Stripe CLI Sandbox lifecycle has
  been verified end to end.
- Lint and the production build pass.

## References

- @docs/stripe-integration-plan.md
- @context/project-overview.md
- @context/coding-standards.md
- @context/features/stripe-phase-1-spec.md
- @src/actions/items.ts
- @src/actions/collections.ts
- @src/actions/ai.ts
- @src/app/api/uploads/route.ts
- @src/app/profile/page.tsx
- @src/lib/db/profile.ts
- @node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
