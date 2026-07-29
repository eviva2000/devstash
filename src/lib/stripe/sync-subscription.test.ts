import type Stripe from "stripe";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  mapStripeSubscription,
  UnsupportedStripeSubscriptionError,
} from "./sync-subscription";

describe("mapStripeSubscription", () => {
  test.each([
    ["active", "PRO", "ACTIVE", true],
    ["past_due", "PRO", "PAST_DUE", false],
    ["unpaid", "PRO", "PAST_DUE", false],
    ["paused", "PRO", "PAST_DUE", false],
    ["canceled", "FREE", "CANCELED", false],
    ["incomplete", "FREE", "INACTIVE", false],
    ["incomplete_expired", "FREE", "INACTIVE", false],
  ] as const)(
    "maps %s to %s/%s",
    (status, plan, subscriptionStatus, grantsPro) => {
      const snapshot = mapStripeSubscription(subscription({ status }), {
        monthly: "price_monthly",
        yearly: "price_yearly",
      });

      expect(snapshot).toMatchObject({
        plan,
        subscriptionStatus,
        grantsPro,
        interval: "monthly",
        stripePriceId: "price_monthly",
        stripeSubscriptionStatus: status,
        stripeCancelAtPeriodEnd: false,
      });
      expect(snapshot.stripeCurrentPeriodEnd).toEqual(
        new Date(1_800_000_000 * 1000)
      );
    }
  );

  test("recognizes the configured annual Price", () => {
    expect(
      mapStripeSubscription(subscription({ priceId: "price_yearly" }), {
        monthly: "price_monthly",
        yearly: "price_yearly",
      }).interval
    ).toBe("yearly");
  });

  test("treats a Stripe cancel_at timestamp as a scheduled cancellation", () => {
    expect(
      mapStripeSubscription(
        subscription({ cancelAt: 1_800_000_000 }),
        { monthly: "price_monthly", yearly: "price_yearly" }
      ).stripeCancelAtPeriodEnd
    ).toBe(true);
  });

  test.each([
    subscription({ priceId: "price_unknown" }),
    subscription({ status: "trialing" }),
    subscription({ itemCount: 2 }),
  ])("fails closed for unsupported subscription shapes", (value) => {
    expect(() =>
      mapStripeSubscription(value, {
        monthly: "price_monthly",
        yearly: "price_yearly",
      })
    ).toThrow(UnsupportedStripeSubscriptionError);
  });
});

function subscription({
  itemCount = 1,
  cancelAt = null,
  priceId = "price_monthly",
  status = "active",
}: {
  itemCount?: number;
  cancelAt?: number | null;
  priceId?: string;
  status?: Stripe.Subscription.Status;
} = {}): Stripe.Subscription {
  const item = {
    id: "si_1",
    current_period_end: 1_800_000_000,
    current_period_start: 1_700_000_000,
    price: {
      id: priceId,
      recurring: { interval: "month" },
    },
  };

  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status,
    cancel_at_period_end: false,
    cancel_at: cancelAt,
    metadata: { app_user_id: "user-1" },
    items: {
      object: "list",
      data: Array.from({ length: itemCount }, (_, index) => ({
        ...item,
        id: `si_${index + 1}`,
      })),
      has_more: false,
      url: "/v1/subscription_items",
    },
  } as unknown as Stripe.Subscription;
}
