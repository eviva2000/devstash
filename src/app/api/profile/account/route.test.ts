import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";

import { DELETE } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stripe/client", () => ({ getStripeClient: vi.fn() }));

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<Session | null>>;
const deleteManyMock = vi.mocked(prisma.user.deleteMany);
const findUniqueMock = vi.mocked(prisma.user.findUnique);
const getStripeClientMock = vi.mocked(getStripeClient);
const cancelMock = vi.fn();

describe("DELETE /api/profile/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getStripeClientMock.mockReturnValue({
      subscriptions: { cancel: cancelMock },
    } as never);
  });

  test("cancels a live subscription before deleting the local user", async () => {
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: "sub_1",
      stripeSubscriptionStatus: "active",
    } as never);
    cancelMock.mockResolvedValue({ id: "sub_1", status: "canceled" });
    deleteManyMock.mockResolvedValue({ count: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(cancelMock).toHaveBeenCalledWith("sub_1");
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(cancelMock.mock.invocationCallOrder[0]).toBeLessThan(
      deleteManyMock.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
  });

  test("keeps the account when Stripe cancellation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: "sub_1",
      stripeSubscriptionStatus: "past_due",
    } as never);
    cancelMock.mockRejectedValue(new Error("Stripe unavailable"));

    const response = await DELETE();

    expect(response.status).toBe(502);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  test("deletes locally without Stripe when no live subscription exists", async () => {
    findUniqueMock.mockResolvedValue({
      stripeSubscriptionId: "sub_old",
      stripeSubscriptionStatus: "canceled",
    } as never);
    deleteManyMock.mockResolvedValue({ count: 1 });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(cancelMock).not.toHaveBeenCalled();
    expect(deleteManyMock).toHaveBeenCalled();
  });
});

function sessionForUser(userId: string): Session {
  return {
    user: {
      id: userId,
      name: "Demo",
      email: "demo@devstash.io",
      image: null,
    },
    expires: "2026-08-01T00:00:00.000Z",
  };
}
