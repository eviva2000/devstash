import type Stripe from "stripe";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { syncStripeSubscription } from "@/lib/stripe/sync-subscription";

import { processStripeEvent } from "./process-event";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stripe/sync-subscription", () => ({
  syncStripeSubscription: vi.fn(),
}));

const syncMock = vi.mocked(syncStripeSubscription);
const updateManyMock = vi.mocked(prisma.user.updateMany);

describe("processStripeEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    syncMock.mockResolvedValue({ outcome: "updated", userId: "user-1" });
    updateManyMock.mockResolvedValue({ count: 1 });
  });

  test.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ] as const)("synchronizes canonical state for %s", async (type) => {
    const event = stripeEvent(type, {
      id: "sub_1",
      object: "subscription",
    });

    await expect(processStripeEvent(event)).resolves.toEqual({
      outcome: "updated",
      userId: "user-1",
    });
    expect(syncMock).toHaveBeenCalledWith("sub_1", {
      id: "evt_1",
      type,
      created: 1_700_000_000,
      objectId: "sub_1",
    });
  });

  test("repairs Checkout customer ownership before synchronizing", async () => {
    const event = stripeEvent("checkout.session.completed", {
      id: "cs_1",
      object: "checkout.session",
      client_reference_id: "user-1",
      metadata: { app_user_id: "user-1" },
      customer: "cus_1",
      subscription: "sub_1",
    });

    await processStripeEvent(event);

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        OR: [{ stripeCustomerId: null }, { stripeCustomerId: "cus_1" }],
      },
      data: { stripeCustomerId: "cus_1" },
    });
    expect(syncMock).toHaveBeenCalledWith("sub_1", expect.any(Object));
  });

  test.each(["invoice.paid", "invoice.payment_failed"] as const)(
    "uses the current invoice parent relationship for %s",
    async (type) => {
      await processStripeEvent(
        stripeEvent(type, {
          id: "in_1",
          object: "invoice",
          parent: {
            type: "subscription_details",
            subscription_details: {
              subscription: "sub_1",
              metadata: {},
            },
          },
        })
      );

      expect(syncMock).toHaveBeenCalledWith("sub_1", expect.any(Object));
    }
  );

  test("treats unsupported events as successful no-ops", async () => {
    await expect(
      processStripeEvent(
        stripeEvent("payment_intent.succeeded", {
          id: "pi_1",
          object: "payment_intent",
        })
      )
    ).resolves.toEqual({ outcome: "unsupported", userId: null });
    expect(syncMock).not.toHaveBeenCalled();
  });
});

function stripeEvent(
  type: Stripe.Event.Type,
  object: Record<string, unknown>
): Stripe.Event {
  return {
    id: "evt_1",
    object: "event",
    api_version: "2026-06-30.basil",
    created: 1_700_000_000,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event;
}
