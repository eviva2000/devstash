# Stripe Subscription Integration Plan

Research findings and implementation plan for DevStash Pro at **€7/month** or
**€72/year**.

Research date: 2026-07-24.

---

## 1. Recommendation

Use Stripe-hosted Checkout for subscription purchase and Stripe's hosted
Customer Portal for payment-method changes, invoice history, plan changes, and
cancellation.

The application should have four billing boundaries:

1. An authenticated Server Action creates a Checkout Session from a
   server-side allowlist of the monthly and annual Price IDs.
2. A signed webhook is the primary source of truth for subscription state.
3. One database-backed entitlement helper authorizes every Pro feature and
   Free-tier quota.
4. An authenticated post-checkout reconciliation action retrieves the Checkout
   Session from Stripe to make the success UI responsive if webhook delivery is
   delayed. It must never trust the success URL by itself.

Use the existing `User.plan`, `User.subscriptionStatus`,
`User.stripeCustomerId`, and `User.stripeSubscriptionId` fields. Do not add an
`isPro` boolean.

### Recommended access policy

For the first release:

| Local state | Pro access | Behavior |
|---|---:|---|
| `PRO` + `ACTIVE` | Yes | All Pro features |
| `PRO` + `PAST_DUE` | No | Existing data remains readable; show a payment-recovery action |
| `FREE` + `INACTIVE` | No | Free limits apply |
| `FREE` + `CANCELED` | No | Free limits apply; allow resubscription |

This is intentionally strict. A grace period for `PAST_DUE` can be added later,
but it needs an explicit duration and another persisted timestamp. It should not
emerge accidentally from checking only `plan`.

On downgrade, never delete or hide existing content. Block new over-limit
items/collections and new Pro-only operations, while preserving read, edit,
download, and delete access to the user's existing data.

---

## 2. Current state

### Database

The Prisma schema already has:

```prisma
enum SubscriptionPlan {
  FREE
  PRO
}

enum SubscriptionStatus {
  INACTIVE
  ACTIVE
  PAST_DUE
  CANCELED
}

model User {
  plan                 SubscriptionPlan   @default(FREE)
  subscriptionStatus   SubscriptionStatus @default(INACTIVE)
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
}
```

Source: `prisma/schema.prisma:16-38`.

There is no `isPro` field. Adding one would create a second, drift-prone source
of truth for the same concept.

The current schema does not retain enough data to render a useful billing
summary or safely reason about all Stripe states. It lacks:

- the subscribed Price ID;
- Stripe's raw subscription status;
- the current billing-period end;
- whether cancellation is scheduled for period end;
- an idempotency ledger for webhook events.

### Authentication and sessions

NextAuth uses JWT sessions. Its callbacks put only the user ID into the token
and session (`src/auth.ts:37-40`, `src/auth.ts:104-118`). There is no
`SessionProvider`, `useSession()`, or session `update()` billing flow in the
current application.

Server components and actions already obtain the authenticated ID and read
current application data from Prisma. Dashboard pages are dynamic and pass
server-derived `isPro` flags into client components
(`src/components/dashboard/dashboard-shell.tsx:22-78`).

Therefore, the research prompt's proposed JWT workaround should **not** be
implemented:

```ts
// Do not add this pattern.
async jwt({ token }) {
  // A database read on every session validation is unnecessary here.
  token.isPro = await readPlanFromDatabase(token.sub);
  return token;
}
```

Keep the JWT identity-only. Read the current entitlement at the server boundary
that needs it. After checkout, `router.refresh()` or a page reload will cause
the dynamic server component to read fresh database state. This avoids stale
claims without taxing every unrelated session validation.

### Existing Pro check

`src/lib/ai/access.ts:5-11` currently checks only:

```ts
return user?.plan === "PRO";
```

That means a `PAST_DUE` or `CANCELED` user can retain AI access while their plan
still says `PRO`. Replace this helper with the central entitlement service
described below.

### Existing Stripe and billing code

- The `stripe` npm package is not installed.
- There are no Checkout, Portal, webhook, or billing status endpoints.
- `.env.example:25-30` already has placeholders for the Stripe secret,
  publishable key, webhook secret, and monthly/annual Price IDs.
- Hosted Checkout does not need a browser publishable key. Keep
  `STRIPE_PUBLISHABLE_KEY` unused or remove it until Stripe.js is actually
  introduced.
- The public pricing control still shows the previous **$8/month** and
  **$72/year** prices, an effective annual price of `$6/month`, and "Save 25%."
  The new brief requires **€7/month** and **€72/year**. Update the currency,
  monthly amount, and savings claim to **save €12/year (about 14%)**. Both
  choices also link to `/register` and discard the selected interval
  (`src/components/homepage/pricing-toggle.tsx:13-15`,
  `src/components/homepage/pricing-toggle.tsx:63-67`).

### API and Server Action conventions

Existing Route Handlers:

- use native `Request` and `Response.json`;
- export HTTP methods explicitly;
- call `auth()` for authenticated user endpoints;
- return explicit status codes;
- log detailed server errors and return generic client errors.

Examples: `src/app/api/uploads/route.ts:21-91` and
`src/app/api/profile/password/route.ts:18-98`.

Existing Server Actions authenticate, validate with Zod, call user-scoped
database helpers, revalidate affected paths, and return discriminated
success/error results. Billing actions should follow the same pattern.

The bundled Next.js 16.2.4 Route Handler guide confirms that an App Router
`POST` handler receives the Web `Request` object and is not cached. A Stripe
webhook can therefore use `await request.text()` directly; no Pages Router
`bodyParser` configuration belongs in this project.

### Settings surface

There is no `/settings` or `/billing` route. `/profile` is the current
settings-like surface:

- page and authentication: `src/app/profile/page.tsx:31-45`;
- usage cards: `src/app/profile/page.tsx:98-121`;
- account actions: `src/app/profile/page.tsx:160-162`;
- data query: `src/lib/db/profile.ts:3-76`;
- sidebar link: `src/components/dashboard/dashboard-sidebar.tsx:286-296`.

Add a "Plan and billing" card to `/profile` for the first release. This is less
disruptive than introducing a settings route hierarchy, and `/profile` is
already protected by `src/proxy.ts`.

---

## 3. Feature-gating findings

### Free limits

The product specification defines:

- Free: 50 items and 3 collections;
- Pro: unlimited items and collections.

Sources: `context/project-overview.md:697-702` and
`context/project-overview.md:738-749`.

These limits are not enforced today.

#### Items

`src/actions/items.ts:104-139` authenticates and validates item creation but
does not check plan or usage. `src/lib/db/items.ts:342-425` already creates an
item inside a transaction. The authoritative item limit belongs inside that
transaction, before `tx.item.create()`.

`MAX_ITEM_QUERY_LIMIT = 50` in `src/lib/db/items.ts:24` is only a query cap. It
is not a Free-plan limit. The current type and collection queries return at
most 50 rows (`src/lib/db/items.ts:272-327`), so claiming "unlimited" for Pro
also requires pagination or cursor-based loading.

#### Collections

`src/actions/collections.ts:44-78` and
`src/lib/db/collections.ts:186-202` create collections without a plan/count
check. Wrap the count and create in one serializable transaction.

The collection read limit of 100 (`src/lib/db/collections.ts:9`,
`src/lib/db/collections.ts:139-152`) is also a query cap, not a product limit.

#### Concurrency requirement

A simple `count()` followed by `create()` is vulnerable to two requests both
passing at 49 items or 2 collections. Use a serializable Prisma transaction
with bounded retry on serialization conflicts, or acquire a per-user database
lock before the count and create.

Return a typed quota error such as `ITEM_LIMIT_REACHED` or
`COLLECTION_LIMIT_REACHED`. Do not overload the existing `null` result from
item creation, which already represents several unrelated failures.

### AI

AI actions already have server and UI checks
(`src/actions/ai.ts:103-122`, `src/actions/ai.ts:194-213`), but the shared helper
checks only the plan. Make AI use the new active-entitlement helper.

### Uploads

Every authenticated user can currently upload images and files:

- route: `src/app/api/uploads/route.ts:21-73`;
- accepted action input: `src/actions/items.ts:72-102`;
- upload consumption: `src/lib/db/items.ts:368-424`;
- UI: `src/components/dashboard/item-create-dialog.tsx:90-118`.

Gate both document and image uploads after resolving the item type and before
writing to R2.
Recheck the entitlement when consuming the upload token during item creation,
so a stale upload token or mid-flow downgrade cannot bypass the policy.

The product decision is:

- both file and image uploads require active Pro;
- file and image list routes require active Pro and show a server-gated upgrade
  or billing-recovery page before querying the protected item list;
- actual limits are 5 MB for images and 10 MB for documents
  (`src/lib/file-uploads.ts:22-61`);
- the project overview describes 5 MB Free and 50 MB Pro.

Keep the initial size limits at 5 MB for images and 10 MB for documents unless
a later feature changes them. Align the homepage, sidebar badges, validation
copy, and tests with the active-Pro requirement before release.

### Custom item types

The database supports user-owned item types
(`prisma/schema.prisma:147-165`), but application CRUD does not exist. Current
item creation accepts seven hard-coded slugs and requires a system type
(`src/actions/items.ts:72-102`, `src/lib/db/items.ts:342-350`).

When custom type CRUD is implemented:

- require active Pro for create, update, and delete;
- resolve types by system ownership or authenticated user ownership, never by
  slug alone;
- keep existing custom types/items readable after downgrade;
- block new items under paid custom types until access resumes.

### Export

Export is listed in the product specification but is not implemented. Its
future authenticated route/action must call the central Pro entitlement helper
before querying or generating an archive. Hiding the button is not sufficient.

### Downgrade behavior

If a user downgrades while over the Free limit:

- keep all existing items, collections, uploads, and custom types;
- allow reading, editing, downloading, deleting, and exporting only when the
  specific operation remains entitled;
- block new items until the count is below 50;
- block new collections until the count is below 3;
- block new file/image uploads, AI calls, custom-type mutations, and paid export;
- show current usage, the reason for the block, and a "Manage billing" or
  "Upgrade" action.

---

## 4. Target architecture

### Purchase flow

```text
Pricing/Profile UI
  -> authenticated createCheckoutSession({ interval, attemptId })
  -> server maps interval to an allowed Price ID
  -> server creates/reuses the user's Stripe Customer
  -> Stripe-hosted Checkout
  -> signed Stripe webhook
  -> idempotent subscription reconciliation
  -> User billing snapshot in PostgreSQL
  -> dynamic Profile/Dashboard reads fresh entitlements
```

The browser may send only:

```ts
type BillingInterval = "monthly" | "yearly";
```

It must never send an arbitrary Price ID, Customer ID, amount, currency,
subscription status, or user ID.

### Billing management flow

```text
Profile billing card
  -> authenticated createBillingPortalSession()
  -> server reads stripeCustomerId from the authenticated user
  -> fresh Stripe Portal Session
  -> Stripe-hosted portal
  -> subscription/payment changes
  -> signed webhook
  -> local billing snapshot and entitlements update
```

### Post-checkout flow

Set the Checkout success URL to:

```text
{APP_URL}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}
```

The placeholder must remain literal when creating the Session.

On that page:

1. show "Confirming your subscription";
2. call an authenticated reconciliation action with `session_id`;
3. retrieve the Checkout Session using the Stripe secret key;
4. verify `client_reference_id` or metadata equals the authenticated user ID;
5. retrieve and sync the canonical Subscription;
6. refresh the profile data;
7. show active, pending, or failed state.

The verified webhook remains primary. A query parameter or success-page visit
alone must never grant Pro access, and the flow must still work when the user
closes Checkout before returning.

### Subscription-state synchronization

Listen for:

| Event | Local action |
|---|---|
| `checkout.session.completed` | Verify mapping, store Customer/Subscription IDs, reconcile |
| `customer.subscription.created` | Reconcile canonical subscription |
| `customer.subscription.updated` | Sync status, Price, cancellation flag, and period end |
| `customer.subscription.deleted` | Set Free/Canceled and end Pro access |
| `invoice.paid` | Retrieve the related Subscription and reconcile active state |
| `invoice.payment_failed` | Retrieve and reconcile; show payment-recovery state |

If delayed payment methods are enabled, also handle:

- `checkout.session.async_payment_succeeded`;
- `checkout.session.async_payment_failed`.

Optional operational events include `checkout.session.expired`,
`invoice.payment_action_required`, and `customer.updated`.

Stripe does not guarantee event order and can deliver duplicates. Do not model
the webhook as "event X always follows event Y." For subscription/invoice
events, retrieve the latest Subscription from Stripe and sync a canonical
snapshot instead of blindly applying the event payload as a state transition.

Persist each `event.id` under a unique key. The event ledger insert and local
user update should commit in one database transaction. If multiple webhook
workers may process events for the same user concurrently, serialize the final
sync per user with a queue or database advisory lock. Respond `2xx` only after
durable processing or durable queueing.

### Stripe-to-local status mapping

Store Stripe's raw status as well as the simplified application status:

| Stripe status | Local plan | Local status | Pro entitlement |
|---|---|---|---:|
| `active` | `PRO` | `ACTIVE` | Yes |
| `past_due` | `PRO` | `PAST_DUE` | No under the recommended policy |
| `canceled` | `FREE` | `CANCELED` | No |
| `incomplete` / `incomplete_expired` | `FREE` | `INACTIVE` | No |
| `unpaid` / `paused` | `PRO` | `PAST_DUE` | No |
| `trialing` | Product decision | Product decision | No trials are planned for MVP |

Do not enable trials in Stripe until a local `TRIALING` policy is deliberately
implemented.

Validate that the canonical Subscription contains exactly one recognized
monthly or annual Price. Unknown Prices should produce an operational alert and
must not silently grant access.

### Preventing duplicate subscriptions

Use all of these controls:

- reuse one Stripe Customer per DevStash user;
- reject Checkout creation when the user already has a live subscription,
  including `active`, `trialing`, `past_due`, `unpaid`, or `paused`;
- send existing subscribers to the Portal;
- disable the purchase button while a request is in flight;
- pass a browser-generated UUID for one button attempt and use it as Stripe's
  idempotency key when retrying the exact same request;
- enable Stripe's "limit customers to one subscription" behavior;
- optionally persist pending Checkout attempts if multi-tab duplicate Sessions
  become a real problem.

Stripe idempotency keys must be reused only with the same parameters. A new
intentional purchase attempt receives a new UUID.

---

## 5. Database changes

Extend `User` and add a webhook ledger:

```prisma
model User {
  // Existing fields
  plan                         SubscriptionPlan   @default(FREE)
  subscriptionStatus           SubscriptionStatus @default(INACTIVE)
  stripeCustomerId             String?            @unique
  stripeSubscriptionId         String?            @unique

  // New billing snapshot fields
  stripePriceId                String?
  stripeSubscriptionStatus     String?
  stripeCurrentPeriodEnd       DateTime?
  stripeCancelAtPeriodEnd      Boolean            @default(false)
  stripeLastEventCreatedAt     DateTime?
}

model StripeWebhookEvent {
  id              String   @id
  type            String
  objectId        String?
  stripeCreatedAt DateTime
  processedAt     DateTime @default(now())

  @@index([type, objectId])
  @@map("stripe_webhook_events")
}
```

Use mapped snake_case column names to match the existing schema style.

`stripeLastEventCreatedAt` is a defensive sync cursor, not the sole ordering
mechanism. The handler should still retrieve canonical Stripe state. Event
timestamps have limited precision, so per-user serialization is preferable if
concurrent processing is introduced.

For the current Stripe API, billing period fields are associated with
Subscription Items rather than assuming the older top-level Subscription
fields. Implement extraction against the installed SDK's types and choose the
single recognized recurring item.

No separate `isPro` column is needed.

---

## 6. Files to create

### `src/lib/stripe/client.ts`

Create a lazy, server-only Stripe client, matching the existing OpenAI client
pattern:

```ts
import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient ??= new Stripe(apiKey);
  return stripeClient;
}
```

Install the current stable `stripe` package and commit its resolved version in
the lockfile. Let the SDK use the API version it was generated for unless there
is a tested reason to override it. Configure the Dashboard webhook endpoint to
the same tested API version.

### `src/lib/stripe/config.ts`

Validate server-only billing configuration and map trusted interval slugs:

```ts
import "server-only";

import { z } from "zod";

const stripeEnvSchema = z.object({
  APP_URL: z.string().url(),
  STRIPE_PRICE_ID_MONTHLY: z.string().startsWith("price_"),
  STRIPE_PRICE_ID_YEARLY: z.string().startsWith("price_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
});

export type BillingInterval = "monthly" | "yearly";

export function getPriceId(interval: BillingInterval): string {
  const env = stripeEnvSchema.parse(process.env);
  return interval === "monthly"
    ? env.STRIPE_PRICE_ID_MONTHLY
    : env.STRIPE_PRICE_ID_YEARLY;
}
```

In practice, split webhook-secret validation from Checkout configuration so
building or testing one path does not unnecessarily require every variable.
Reuse the project's canonical `APP_URL` behavior rather than trusting an
incoming `Host` header.

### `src/lib/billing/entitlements.ts`

Make this the only feature-authorization policy:

```ts
import "server-only";

import { prisma } from "@/lib/prisma";

export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;

export async function getUserEntitlements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
    },
  });

  const hasActivePro =
    user?.plan === "PRO" && user.subscriptionStatus === "ACTIVE";

  return {
    hasActivePro,
    canUseAi: hasActivePro,
    canUploadFiles: hasActivePro,
    canManageCustomTypes: hasActivePro,
    canExport: hasActivePro,
    itemLimit: hasActivePro ? null : FREE_ITEM_LIMIT,
    collectionLimit: hasActivePro ? null : FREE_COLLECTION_LIMIT,
  };
}
```

Use `null` to mean unlimited rather than serializing JavaScript `Infinity`.

Add a `requireActiveProUser()` wrapper that returns the project's standard
typed action/route error where appropriate.

### `src/lib/stripe/customer.ts`

Implement `getOrCreateStripeCustomer(userId)`:

1. query the authenticated user;
2. return the stored Customer ID when present;
3. otherwise create a Stripe Customer with email/name and
   `metadata.app_user_id`;
4. persist the ID using a conditional update;
5. handle concurrent creation safely and log any orphan for cleanup.

Do not locate or authorize customers by email alone. Email is mutable and
nullable; the internal user ID metadata and stored Stripe ID are durable.

### `src/lib/stripe/sync-subscription.ts`

Centralize canonical synchronization:

```ts
type SyncSource = {
  eventId?: string;
  eventCreatedAt?: Date;
};

export async function syncStripeSubscription(
  stripeSubscriptionId: string,
  source: SyncSource
) {
  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(
    stripeSubscriptionId,
    { expand: ["items.data.price"] }
  );

  // 1. Resolve the user by stored subscription/customer ID or metadata.
  // 2. Validate the Customer and allowed Price.
  // 3. Derive local plan/status and the current period end.
  // 4. Insert event ledger row and update the User in one transaction.
  // 5. Treat a duplicate event ID as successful no-op.
}
```

Both webhooks and post-checkout reconciliation must call this helper. Keep all
status mapping in this file so handlers cannot drift.

For invoice events, use the installed Stripe SDK's current typed relationship
to locate the Subscription. Do not copy an older top-level
`invoice.subscription` example without checking the installed API version.

### `src/actions/billing.ts`

Add three authenticated actions:

- `createCheckoutSession({ interval, attemptId })`;
- `createBillingPortalSession()`;
- `reconcileCheckoutSession({ sessionId })`.

Checkout outline:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const checkoutInput = z.object({
  interval: z.enum(["monthly", "yearly"]),
  attemptId: z.string().uuid(),
});

export async function createCheckoutSession(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, code: "UNAUTHENTICATED" } as const;
  }

  const parsed = checkoutInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "INVALID_INPUT" } as const;
  }

  let checkoutUrl: string;

  try {
    const user = await getBillingUser(session.user.id);
    await assertNoLiveSubscription(user);

    const customerId = await getOrCreateStripeCustomer(user.id);
    const stripe = getStripeClient();
    const origin = getConfiguredAppOrigin();

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        line_items: [
          { price: getPriceId(parsed.data.interval), quantity: 1 },
        ],
        metadata: {
          app_user_id: user.id,
          checkout_attempt_id: parsed.data.attemptId,
        },
        subscription_data: {
          metadata: {
            app_user_id: user.id,
            interval: parsed.data.interval,
          },
        },
        success_url:
          `${origin}/profile?checkout=success` +
          `&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/profile?checkout=canceled`,
      },
      { idempotencyKey: parsed.data.attemptId }
    );

    if (!checkout.url) {
      return { success: false, code: "CHECKOUT_UNAVAILABLE" } as const;
    }

    checkoutUrl = checkout.url;
  } catch (error) {
    // Log provider details server-side and return a generic typed error.
    return { success: false, code: "CHECKOUT_UNAVAILABLE" } as const;
  }

  // Next redirect() throws framework control flow, so keep it outside catch.
  redirect(checkoutUrl);
}
```

Hash or use the opaque attempt UUID directly for the idempotency key; do not
put email or other personal data in it.

Portal outline:

```ts
const portal = await stripe.billingPortal.sessions.create({
  customer: user.stripeCustomerId,
  return_url: `${origin}/profile`,
});

redirect(portal.url);
```

Never accept `customer` from the browser. Create a fresh Portal Session for
each click.

Reconciliation must retrieve the Checkout Session, verify it belongs to the
logged-in user, require a Subscription object/ID, then call
`syncStripeSubscription`. It must not trust metadata returned by the browser.

### `src/app/api/stripe/webhook/route.ts`

The webhook is public at the HTTP layer and authenticated by Stripe's
signature:

```ts
import type Stripe from "stripe";

import { getStripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await processStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      error,
    });
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
```

Call `request.text()` exactly once and before any JSON parsing. A webhook secret
printed by `stripe listen` is different from the Dashboard endpoint's secret.

Keep `processStripeEvent()` in a separate testable module. Unsupported event
types should return a successful no-op; invalid signatures should return 400;
retryable processing failures should return 500.

### `src/lib/stripe/process-event.ts`

Use an explicit event switch. Extract related object IDs using the installed
SDK's types, then route all subscription changes through
`syncStripeSubscription`.

Do not send emails, update R2, or perform other non-transactional side effects
without their own idempotency keys. If webhook work grows, durably enqueue it
and acknowledge only after enqueue succeeds.

### `src/components/profile/profile-billing-card.tsx`

Render:

- current plan;
- monthly/annual interval;
- active, past-due, canceling, or canceled state;
- next renewal/end date;
- item and collection usage;
- monthly/annual upgrade buttons for Free users;
- "Manage billing" for users with a Customer;
- a payment-recovery message for `PAST_DUE`;
- post-checkout pending/success/error feedback.

The card receives a server-derived billing view model. Do not pass secret
Stripe IDs to client props.

### Tests to create

```text
src/lib/billing/entitlements.test.ts
src/lib/stripe/config.test.ts
src/lib/stripe/sync-subscription.test.ts
src/lib/stripe/process-event.test.ts
src/actions/billing.test.ts
src/app/api/stripe/webhook/route.test.ts
src/components/profile/profile-billing-card.test.tsx
```

Use Stripe's test helper for signed webhook fixtures where appropriate:
`stripe.webhooks.generateTestHeaderString`.

---

## 7. Files to modify

### Package and environment

#### `package.json` and lockfile

- add `stripe`;
- do not add `@stripe/stripe-js` for hosted Checkout;
- commit the resolved dependency version.

#### `.env.example`

Keep and document:

```dotenv
APP_URL="http://localhost:3000"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ID_MONTHLY=""
STRIPE_PRICE_ID_YEARLY=""
```

Remove `STRIPE_PUBLISHABLE_KEY` or comment that it is unused until browser-side
Stripe.js exists. If it is later exposed, use
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; never expose a secret key.

Use separate test/sandbox and live values in their deployment environments.
Price IDs and webhook signing secrets are environment-specific.

### Prisma

#### `prisma/schema.prisma`

- add billing snapshot fields to `User`;
- add `StripeWebhookEvent`;
- retain unique Customer and Subscription IDs;
- keep `plan` and `subscriptionStatus`;
- do not add `isPro`.

#### `prisma/migrations/<timestamp>_add_stripe_billing_state/`

Create and review a development migration. No production migration belongs in
the research phase.

### Authentication and entitlement access

#### `src/auth.ts`

No billing claim changes. Keep the JWT/session callbacks identity-only.

#### `src/types/next-auth.d.ts`

No `isPro`, plan, Customer ID, or Subscription ID additions are needed.

#### `src/lib/ai/access.ts`

Replace the plan-only query with the central
`getUserEntitlements(userId).hasActivePro` policy.

#### `src/actions/ai.ts`

Keep the existing server checks, but consume the new typed entitlement result
and return a consistent `PRO_REQUIRED` or `BILLING_PAST_DUE` response.

### Quotas

#### `src/lib/db/items.ts`

- inside the existing creation transaction, load the entitlement and item
  count;
- atomically reject Free creation at 50;
- recheck file/image-upload entitlement when consuming an upload;
- return typed creation failures;
- add serializable transaction retry;
- replace fixed "load at most 50" behavior with pagination for Pro-scale lists.

#### `src/actions/items.ts`

- map typed quota and Pro-feature failures to clear user messages;
- do not rely on client `isPro`;
- keep validation and user scoping;
- add tests for Free at 49/50, Pro over 50, past-due, concurrent creation, and
  upload bypass attempts.

#### `src/lib/db/collections.ts`

- make count plus create atomic;
- reject Free creation at 3;
- add serializable retry;
- add pagination before promising truly unlimited collections.

#### `src/actions/collections.ts`

- map `COLLECTION_LIMIT_REACHED` to a typed upgrade result;
- test Free at 2/3, Pro over 3, past-due, and concurrent creation.

### Uploads

#### `src/app/api/uploads/route.ts`

- resolve the requested item type;
- require active Pro for document/file and image uploads before writing to R2;
- keep auth, rate limiting, MIME validation, and generic provider errors.

#### `src/lib/file-uploads.ts`

Align actual byte limits and error messages with the 5 MB Pro-image /
10 MB Pro-document decision.

#### `src/app/api/uploads/route.test.ts`

Add Free file/image rejection, active-Pro file/image, past-due, invalid MIME,
and oversized-file coverage.

### Profile and pricing UI

#### `src/lib/db/profile.ts`

Extend the profile view model with UI-safe billing fields:

- plan and local status;
- subscribed interval derived from the trusted Price mapping;
- current period end;
- cancellation-at-period-end;
- current item and collection usage.

Do not return Stripe Customer or Subscription IDs to the client.

#### `src/app/profile/page.tsx`

- render `ProfileBillingCard`;
- handle `checkout=success|canceled`;
- pass the authenticated user's safe billing view model;
- remain force-dynamic so refreshes read webhook updates.

#### `src/components/homepage/pricing-toggle.tsx`

- preserve `monthly` versus `yearly` through registration/sign-in;
- send authenticated users to the profile upgrade flow;
- require an explicit user click after authentication before creating Checkout;
- align upload copy with the final image/document policy.

A safe public link shape is:

```text
/register?callbackUrl=%2Fprofile%3Fupgrade%3Dyearly
```

Do not create a paid Checkout Session as a side effect of a GET request.

#### Dashboard create components

Update:

```text
src/components/dashboard/dashboard-shell.tsx
src/components/dashboard/dashboard-header.tsx
src/components/dashboard/mobile-create-menu.tsx
src/components/dashboard/item-create-dialog.tsx
src/components/dashboard/collection-create-dialog.tsx
src/components/items/item-list-shell-client.tsx
src/components/dashboard/dashboard-sidebar.tsx
```

Pass a server-derived entitlement/usage view model. Show `50 / 50 items` or
`3 / 3 collections`, lock disallowed new operations, and offer an upgrade or
billing-recovery action. These UI checks improve clarity but do not replace the
server gates.

### Account deletion

#### `src/app/api/profile/account/route.ts`

It currently deletes only the local user (`src/app/api/profile/account/route.ts:4-15`).
That can leave a paying Stripe subscription without a local owner.

Before local deletion:

1. load the user's Stripe Customer/Subscription IDs;
2. immediately cancel an active subscription so no future charge can occur;
3. apply the agreed billing-data retention policy to the Stripe Customer;
4. only then delete the local user;
5. if Stripe cancellation fails, keep the local account and return a retryable
   generic error;
6. make later webhook delivery for the deleted user a safe, logged no-op.

Whether to delete the Stripe Customer or retain the minimum required billing
record is a legal/accounting policy decision. Subscription cancellation is not
optional.

### Custom types and export

When their implementations are added, every server mutation/route must use
`getUserEntitlements`. Add UI affordances only after the server gate and tests
exist.

---

## 8. Stripe Dashboard setup

Perform setup separately in a Stripe Sandbox first.

### Product and Prices

1. Create one Product: `DevStash Pro`.
2. Create a recurring monthly Price:

   - currency: EUR;
   - amount: 700 cents;
   - interval: month;
   - optional lookup key: `devstash_pro_monthly`.

3. Create a recurring annual Price:

   - currency: EUR;
   - amount: 7200 cents;
   - interval: year;
   - optional lookup key: `devstash_pro_yearly`.

4. Put the Sandbox `price_...` IDs in the local/development environment.
5. Create separate live Prices and environment values for production.

Price amounts are not edited in place. For a future price change, create a new
Price, archive the old one for new sales, and decide explicitly whether
existing subscribers are migrated.

### Checkout

Configure:

- subscription mode through the server-created Session;
- no trial for MVP;
- supported payment methods;
- promotion codes only if the business intends to support them;
- billing address collection if tax/accounting requires it;
- automatic tax only after registrations and price tax behavior are decided;
- branding, support contact, Terms, Privacy Policy, and receipt settings;
- the statement descriptor shown on card statements.

Decide whether €7/€72 are tax-inclusive or tax-exclusive before going live.

### Customer Portal

Enable:

- payment-method updates;
- invoice history;
- cancellation;
- cancellation-at-period-end behavior;
- monthly/annual switching, if desired.

If plan switching is enabled, decide Stripe's proration behavior and test both
directions. Keep the allowed Portal products/Prices restricted to the two
DevStash Pro Prices.

### Duplicate-subscription protection

Enable Checkout's setting that limits a Customer to one active subscription
and redirects an existing subscriber to the Portal. This complements, but does
not replace, the server-side live-subscription check.

### Webhook endpoint

Create:

```text
https://<production-domain>/api/stripe/webhook
```

Subscribe only to the required events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Add async-payment events only if those payment methods are enabled.

Pin the endpoint to the API version tested with the installed Stripe SDK. Store
the endpoint's `whsec_...` value as `STRIPE_WEBHOOK_SECRET`. The local Stripe
CLI prints a different secret for local forwarding.

### Operational setup

- restrict live secret-key access;
- configure webhook failure alerts;
- log event IDs, types, object IDs, user IDs, and outcomes without secrets or
  full payment data;
- document replay/reconciliation procedures;
- decide customer email/support handling for failed payments;
- complete tax, refund, cancellation, privacy, and billing-retention policies.

---

## 9. Testing checklist

### Unit tests

- environment validation rejects missing, malformed, and mixed test/live IDs;
- interval mapping accepts only `monthly` and `yearly`;
- client-supplied Price, Customer, user, or amount fields are ignored/rejected;
- entitlement is true only for `PRO + ACTIVE`;
- every Stripe status maps to the expected local state;
- unknown Prices never grant Pro;
- billing-period extraction uses the installed SDK's current Subscription Item
  shape;
- Checkout uses the authenticated user, allowed Price, canonical `APP_URL`, and
  one-attempt idempotency key;
- existing live subscribers receive a Portal/manage-billing result;
- Portal creation reads Customer ID from the database;
- reconciliation rejects Sessions owned by another user;
- raw success query parameters alone cannot grant access.

### Webhook tests

- missing signature returns 400;
- invalid signature returns 400;
- valid signature uses the exact raw body;
- unsupported event returns 200 without mutation;
- duplicate `event.id` is a successful no-op;
- `checkout.session.completed` repairs Customer/Subscription mapping;
- created/updated/deleted subscription events reconcile canonical state;
- `invoice.paid` and `invoice.payment_failed` resolve the current Subscription
  using current SDK types;
- reversed event delivery converges on current Stripe state;
- simultaneous events for one user do not commit stale state;
- database/provider failure returns 500 so Stripe retries;
- deleted local user is handled safely;
- event logs contain no secret or full payment details.

### Entitlement and quota tests

- Free item creation succeeds at 49 and fails at 50;
- concurrent Free item creates cannot produce item 51;
- Free collection creation succeeds at 2 and fails at 3;
- concurrent Free collection creates cannot produce collection 4;
- active Pro can create above both limits;
- past-due/canceled cannot use paid operations;
- Free file and image uploads are rejected before R2 write;
- a forged/stale upload token is rejected during item creation;
- active Pro file and image uploads succeed at their selected size limits;
- AI requires active Pro;
- downgrade preserves existing data and downloads;
- users above Free limits can delete until they are below the limit.

### UI tests

- monthly and annual selection survives registration/sign-in;
- the billing card shows current plan/status/renewal/cancellation state;
- Checkout buttons cannot be double-submitted;
- post-checkout shows pending before webhook/reconciliation, then active;
- canceled Checkout does not alter access;
- past-due state links to the Portal;
- limit messages show actual server counts;
- stale tabs surface typed server errors rather than silently failing;
- billing state and quota UI are keyboard and screen-reader accessible.

### Sandbox end-to-end tests

Run:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the `whsec_...` printed by that command for local testing.

Test:

- real monthly Sandbox Checkout;
- real annual Sandbox Checkout;
- abandoned/canceled Checkout;
- successful initial payment;
- monthly and annual renewal;
- renewal payment failure and recovery;
- cancellation at period end;
- immediate cancellation;
- monthly-to-annual and annual-to-monthly Portal changes, if enabled;
- duplicate delivery and manual event resend;
- success page never visited;
- webhook delayed until after success redirect;
- two tabs attempting Checkout concurrently;
- account deletion while subscribed.

Use Stripe Test Clocks/Simulations for renewal, cancellation, and recovery.
Stripe notes that real Sandbox subscriptions are more reliable for
end-to-end correlation than isolated synthetic CLI events.

### Release checks

- use Sandbox/test keys outside production;
- use live keys and live Price IDs only in production;
- verify the production webhook secret belongs to the production endpoint;
- verify the production `APP_URL`;
- run a low-risk live purchase and refund/cancellation rehearsal;
- confirm Dashboard email, tax, Portal, branding, and statement settings;
- monitor webhook deliveries and failed-payment paths after launch;
- retain a manual reconciliation command/runbook keyed by Stripe Customer or
  Subscription ID.

---

## 10. Implementation order

### Phase 1: policy and foundation

1. Apply the active-Pro requirement to both image and document uploads.
2. Confirm strict `PAST_DUE` behavior, cancellation timing, proration, tax
   behavior, and billing-data retention.
3. Create Sandbox Product/Prices and configure environment values.
4. Install `stripe`.
5. Add and migrate the billing snapshot fields and webhook ledger.
6. Add Stripe config/client helpers and tests.
7. Add the central entitlement helper and replace AI's plan-only check.

### Phase 2: Stripe lifecycle

8. Implement Customer creation/reuse.
9. Implement canonical subscription synchronization and status mapping.
10. Implement the signed, idempotent webhook route.
11. Add webhook and synchronization tests before exposing Checkout.
12. Implement Checkout, Portal, and post-checkout reconciliation actions.
13. Test monthly/annual Sandbox purchases and Portal cancellation end to end.

### Phase 3: billing UI

14. Extend the safe profile view model.
15. Add the profile billing card and pending/success/failure states.
16. Preserve the monthly/annual choice through authentication.
17. Enable and test the Customer Portal and duplicate-subscription protection.

### Phase 4: enforce the product

18. Add atomic item and collection limits with concurrency tests.
19. Gate file and image uploads at both upload and item-creation boundaries.
20. Align homepage/sidebar/dialog copy and usage indicators.
21. Add pagination so Pro "unlimited" is visible in practice.
22. Add the central gate to custom item types and export when those features
    are implemented.

### Phase 5: operational hardening

23. Make account deletion subscription-safe.
24. Add webhook alerting, replay/reconciliation tooling, and billing logs.
25. Exercise Test Clocks, payment recovery, out-of-order/duplicate delivery,
    and two-tab Checkout races.
26. Complete live Dashboard configuration and perform a controlled live test.

Do not launch Checkout before webhook idempotency, entitlement tests, and
account-deletion billing safety are in place.

---

## 11. Acceptance criteria

The integration is ready when:

- Stripe IDs and amounts are selected only on the server;
- one DevStash user maps to one Stripe Customer;
- signed webhooks and verified Stripe retrieval are the only ways to grant Pro;
- duplicate and out-of-order events converge safely;
- the application authorizes Pro from current database state, not JWT claims;
- every Pro feature has an authoritative server gate;
- Free quotas are atomic under concurrent requests;
- downgrade never destroys customer content;
- existing subscribers cannot accidentally create a second subscription;
- cancellation and failed-payment state appear correctly in `/profile`;
- account deletion cannot leave an untracked recurring charge;
- monthly and annual Sandbox lifecycle tests pass.

---

## 12. Primary sources

Stripe:

- [Build subscriptions with Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions?locale=en-GB)
- [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create?lang=node)
- [Checkout fulfillment and success-page reconciliation](https://docs.stripe.com/checkout/fulfillment)
- [Subscription webhook events](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Webhook signatures](https://docs.stripe.com/webhooks/signature?lang=node)
- [Webhook delivery and best practices](https://docs.stripe.com/webhooks?lang=node)
- [Idempotent API requests](https://docs.stripe.com/api/idempotent_requests)
- [Customer Portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Limit customers to one subscription](https://docs.stripe.com/payments/checkout/limit-subscriptions)
- [Manage Products and Prices](https://docs.stripe.com/products-prices/manage-prices)
- [Billing testing](https://docs.stripe.com/billing/testing)
- [Test Clocks](https://docs.stripe.com/billing/testing/test-clocks)
- [Stripe CLI](https://docs.stripe.com/stripe-cli/use-cli)
- [API key security](https://docs.stripe.com/keys-best-practices)

Project and framework:

- `context/research/stripe-integration-research.md`
- `context/project-overview.md`
- `prisma/schema.prisma`
- `src/auth.ts`
- `src/lib/ai/access.ts`
- `src/actions/items.ts`
- `src/actions/collections.ts`
- `src/lib/db/items.ts`
- `src/lib/db/collections.ts`
- `src/app/api/uploads/route.ts`
- `src/app/profile/page.tsx`
- `src/lib/db/profile.ts`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
