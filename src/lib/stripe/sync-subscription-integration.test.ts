import type Stripe from "stripe";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";

import { syncStripeSubscription } from "./sync-subscription";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    stripeWebhookEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stripe/client", () => ({ getStripeClient: vi.fn() }));

const transactionMock = prisma.$transaction as unknown as Mock;
const rootEventFindUniqueMock = vi.mocked(
  prisma.stripeWebhookEvent.findUnique
);
const userFindFirstMock = vi.mocked(prisma.user.findFirst);
const getStripeClientMock = vi.mocked(getStripeClient);
const subscriptionRetrieveMock = vi.fn();
const transactionClient = {
  $executeRaw: vi.fn(),
  stripeWebhookEvent: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe("syncStripeSubscription integration boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    process.env.STRIPE_PRICE_ID_YEARLY = "price_yearly";
    getStripeClientMock.mockReturnValue({
      subscriptions: { retrieve: subscriptionRetrieveMock },
    } as never);
    subscriptionRetrieveMock.mockResolvedValue(subscription());
    rootEventFindUniqueMock.mockResolvedValue(null);
    userFindFirstMock.mockResolvedValue({
      id: "user-1",
      stripeCustomerId: "cus_1",
    } as never);
    transactionClient.user.findUnique.mockResolvedValue({
      stripeCustomerId: "cus_1",
      stripeLastEventCreatedAt: null,
    });
    transactionClient.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    transactionClient.stripeWebhookEvent.create.mockResolvedValue({ id: "evt_1" });
    transactionClient.user.update.mockResolvedValue({ id: "user-1" });
    transactionMock.mockImplementation((callback) =>
      callback(transactionClient)
    );
  });

  test("locks per user and stores the event ledger with the snapshot atomically", async () => {
    await expect(
      syncStripeSubscription("sub_1", event("evt_1", 200))
    ).resolves.toMatchObject({
      outcome: "updated",
      userId: "user-1",
      snapshot: {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        grantsPro: true,
      },
    });

    expect(transactionClient.$executeRaw).toHaveBeenCalled();
    expect(transactionClient.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: {
        id: "evt_1",
        type: "customer.subscription.updated",
        objectId: "sub_1",
        stripeCreatedAt: new Date(200 * 1000),
      },
    });
    expect(transactionClient.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        stripeSubscriptionId: "sub_1",
      }),
    });
  });

  test("treats duplicate event IDs as a successful no-op", async () => {
    transactionClient.stripeWebhookEvent.findUnique.mockResolvedValue({
      id: "evt_duplicate",
    });
    rootEventFindUniqueMock.mockResolvedValue({ id: "evt_duplicate" } as never);

    await expect(
      syncStripeSubscription("sub_1", event("evt_duplicate", 200))
    ).resolves.toEqual({
      outcome: "duplicate",
      userId: null,
    });
    expect(subscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(transactionClient.stripeWebhookEvent.create).not.toHaveBeenCalled();
    expect(transactionClient.user.update).not.toHaveBeenCalled();
  });

  test("reversed delivery re-fetches canonical state and never regresses the event cursor", async () => {
    const latest = new Date(300 * 1000);
    transactionClient.user.findUnique
      .mockResolvedValueOnce({
        stripeCustomerId: "cus_1",
        stripeLastEventCreatedAt: null,
      })
      .mockResolvedValueOnce({
        stripeCustomerId: "cus_1",
        stripeLastEventCreatedAt: latest,
      });

    await syncStripeSubscription("sub_1", event("evt_new", 300));
    await syncStripeSubscription("sub_1", event("evt_old", 100));

    expect(subscriptionRetrieveMock).toHaveBeenCalledTimes(4);
    expect(transactionClient.user.update).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        stripeLastEventCreatedAt: latest,
      }),
    });
  });

  test("unknown Prices durably revoke access instead of granting Pro", async () => {
    subscriptionRetrieveMock.mockResolvedValue(
      subscription({ priceId: "price_unknown" })
    );

    await expect(
      syncStripeSubscription("sub_1", event("evt_unknown", 200))
    ).resolves.toMatchObject({
      outcome: "failed_closed",
      snapshot: {
        plan: "FREE",
        subscriptionStatus: "INACTIVE",
        grantsPro: false,
      },
    });
    expect(transactionClient.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        plan: "FREE",
        subscriptionStatus: "INACTIVE",
      }),
    });
  });

  test("propagates Stripe retrieval failures for webhook retry", async () => {
    subscriptionRetrieveMock.mockRejectedValue(new Error("Stripe unavailable"));

    await expect(
      syncStripeSubscription("sub_1", event("evt_1", 200))
    ).rejects.toThrow("Stripe unavailable");
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

function event(id: string, created: number) {
  return {
    id,
    type: "customer.subscription.updated",
    created,
    objectId: "sub_1",
  };
}

function subscription({
  priceId = "price_monthly",
}: {
  priceId?: string;
} = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    object: "subscription",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: { app_user_id: "user-1" },
    items: {
      object: "list",
      data: [
        {
          id: "si_1",
          current_period_start: 1_700_000_000,
          current_period_end: 1_800_000_000,
          price: {
            id: priceId,
            recurring: { interval: "month" },
          },
        },
      ],
      has_more: false,
      url: "/v1/subscription_items",
    },
  } as unknown as Stripe.Subscription;
}
