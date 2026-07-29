import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { syncStripeSubscription } from "@/lib/stripe/sync-subscription";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBillingPortalSession,
  createCheckoutSession,
  reconcileBillingPortal,
  reconcileCheckoutSession,
} from "./billing";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stripe/client", () => ({ getStripeClient: vi.fn() }));
vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: vi.fn(),
}));
vi.mock("@/lib/stripe/sync-subscription", () => ({
  syncStripeSubscription: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<Session | null>>;
const findUniqueMock = vi.mocked(prisma.user.findUnique);
const transactionMock = prisma.$transaction as unknown as Mock;
const getStripeClientMock = vi.mocked(getStripeClient);
const getOrCreateCustomerMock = vi.mocked(getOrCreateStripeCustomer);
const syncMock = vi.mocked(syncStripeSubscription);
const revalidatePathMock = vi.mocked(revalidatePath);
const redirectMock = vi.mocked(redirect);
const checkoutCreateMock = vi.fn();
const checkoutRetrieveMock = vi.fn();
const checkoutListMock = vi.fn();
const checkoutExpireMock = vi.fn();
const portalCreateMock = vi.fn();
const subscriptionListMock = vi.fn();
const transactionClient = {
  $executeRaw: vi.fn(),
};

describe("billing actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = "https://app.devstash.test/path";
    process.env.STRIPE_PRICE_ID_MONTHLY = "price_monthly";
    process.env.STRIPE_PRICE_ID_YEARLY = "price_yearly";
    authMock.mockResolvedValue(sessionForUser("user-1"));
    transactionMock.mockImplementation((callback) =>
      callback(transactionClient)
    );
    getStripeClientMock.mockReturnValue({
      checkout: {
        sessions: {
          create: checkoutCreateMock,
          expire: checkoutExpireMock,
          list: checkoutListMock,
          retrieve: checkoutRetrieveMock,
        },
      },
      billingPortal: {
        sessions: {
          create: portalCreateMock,
        },
      },
      subscriptions: {
        list: subscriptionListMock,
      },
    } as never);
    subscriptionListMock.mockResolvedValue({ data: [] });
    checkoutListMock.mockResolvedValue({ data: [] });
    getOrCreateCustomerMock.mockResolvedValue("cus_1");
    syncMock.mockResolvedValue({ outcome: "updated", userId: "user-1" });
  });

  test("validates Checkout input before creating provider resources", async () => {
    await expect(
      createCheckoutSession({ interval: "weekly", attemptId: "not-a-uuid" })
    ).resolves.toEqual({
      success: false,
      code: "INVALID_INPUT",
      error: "Choose a valid billing interval and try again.",
    });
    expect(getOrCreateCustomerMock).not.toHaveBeenCalled();
  });

  test("uses trusted annual Price, canonical URLs, ownership, and attempt idempotency", async () => {
    const attemptId = "691440cd-6e23-4f31-8a10-cf96c931d321";
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
    } as never);
    checkoutCreateMock.mockResolvedValue({
      url: "https://checkout.stripe.test/session",
    });

    await expect(
      createCheckoutSession({ interval: "yearly", attemptId })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(checkoutCreateMock).toHaveBeenCalledWith(
      {
        mode: "subscription",
        customer: "cus_1",
        client_reference_id: "user-1",
        line_items: [{ price: "price_yearly", quantity: 1 }],
        metadata: {
          app_user_id: "user-1",
          checkout_attempt_id: attemptId,
        },
        subscription_data: {
          metadata: { app_user_id: "user-1" },
        },
        success_url:
          "https://app.devstash.test/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://app.devstash.test/profile?checkout=canceled",
      },
      { idempotencyKey: attemptId }
    );
    expect(redirectMock).toHaveBeenCalledWith(
      "https://checkout.stripe.test/session"
    );
  });

  test("prevents duplicate live subscriptions", async () => {
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: "sub_existing",
      stripeSubscriptionStatus: "active",
    } as never);

    await expect(
      createCheckoutSession({
        interval: "monthly",
        attemptId: "691440cd-6e23-4f31-8a10-cf96c931d321",
      })
    ).resolves.toMatchObject({
      success: false,
      code: "SUBSCRIPTION_EXISTS",
    });
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  test("checks Stripe for a live subscription when the local snapshot is stale", async () => {
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
    } as never);
    subscriptionListMock.mockResolvedValue({
      data: [{ id: "sub_live", status: "active" }],
    });

    await expect(
      createCheckoutSession({
        interval: "monthly",
        attemptId: "691440cd-6e23-4f31-8a10-cf96c931d321",
      })
    ).resolves.toMatchObject({
      success: false,
      code: "SUBSCRIPTION_EXISTS",
    });
    expect(checkoutCreateMock).not.toHaveBeenCalled();
  });

  test("reuses an already-open matching Checkout in a two-tab attempt", async () => {
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
    } as never);
    checkoutListMock.mockResolvedValue({
      data: [
        {
          id: "cs_open",
          mode: "subscription",
          client_reference_id: "user-1",
          line_items: {
            data: [{ price: { id: "price_monthly" } }],
          },
          url: "https://checkout.stripe.test/open",
        },
      ],
    });

    await expect(
      createCheckoutSession({
        interval: "monthly",
        attemptId: "691440cd-6e23-4f31-8a10-cf96c931d321",
      })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(checkoutCreateMock).not.toHaveBeenCalled();
    expect(checkoutExpireMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(
      "https://checkout.stripe.test/open"
    );
  });

  test("creates a fresh Portal Session from the database Customer", async () => {
    findUniqueMock.mockResolvedValue({
      stripeCustomerId: "cus_database",
      stripeSubscriptionId: "sub_1",
      stripeSubscriptionStatus: "active",
    } as never);
    portalCreateMock.mockResolvedValue({
      url: "https://billing.stripe.test/session",
    });

    await expect(createBillingPortalSession()).rejects.toThrow("NEXT_REDIRECT");

    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: "cus_database",
      return_url: "https://app.devstash.test/profile?portal=return",
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: { subscription: "sub_1" },
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: "https://app.devstash.test/profile?portal=canceled",
          },
        },
      },
    });
  });

  test("falls back to the standard portal when Stripe rejects a cancellation deep link", async () => {
    findUniqueMock.mockResolvedValue({
      stripeCustomerId: "cus_database",
      stripeSubscriptionId: "sub_1",
      stripeSubscriptionStatus: "active",
    } as never);
    portalCreateMock
      .mockRejectedValueOnce(new Error("Cancellation flow is unavailable"))
      .mockResolvedValueOnce({ url: "https://billing.stripe.test/session" });

    await expect(createBillingPortalSession()).rejects.toThrow("NEXT_REDIRECT");

    expect(portalCreateMock).toHaveBeenLastCalledWith({
      customer: "cus_database",
      return_url: "https://app.devstash.test/profile?portal=return",
    });
  });

  test("refreshes the tracked subscription after returning from the Customer Portal", async () => {
    findUniqueMock.mockResolvedValue({
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    } as never);

    await expect(reconcileBillingPortal()).resolves.toEqual({ success: true });

    expect(syncMock).toHaveBeenCalledWith("sub_1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  test("rejects reconciliation owned by a different app user", async () => {
    findUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_1" } as never);
    checkoutRetrieveMock.mockResolvedValue({
      id: "cs_1",
      mode: "subscription",
      client_reference_id: "another-user",
      metadata: { app_user_id: "another-user" },
      customer: "cus_1",
      subscription: "sub_1",
    });

    await expect(
      reconcileCheckoutSession({ sessionId: "cs_1" })
    ).resolves.toMatchObject({
      success: false,
      code: "OWNERSHIP_MISMATCH",
    });
    expect(syncMock).not.toHaveBeenCalled();
  });

  test("reconciles only a verified subscription and refreshes dynamic views", async () => {
    findUniqueMock.mockResolvedValue({ stripeCustomerId: "cus_1" } as never);
    checkoutRetrieveMock.mockResolvedValue({
      id: "cs_1",
      mode: "subscription",
      client_reference_id: "user-1",
      metadata: { app_user_id: "user-1" },
      customer: "cus_1",
      subscription: { id: "sub_1" },
    });

    await expect(
      reconcileCheckoutSession({ sessionId: "cs_1" })
    ).resolves.toEqual({ success: true });
    expect(syncMock).toHaveBeenCalledWith("sub_1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });
});

function sessionForUser(userId: string): Session {
  return {
    user: {
      id: userId,
      name: "Demo User",
      email: "demo@devstash.io",
      image: null,
    },
    expires: "2026-08-01T12:00:00.000Z",
  };
}
