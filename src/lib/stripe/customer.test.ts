import { beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";

import {
  getOrCreateStripeCustomer,
  StripeCustomerUserNotFoundError,
} from "./customer";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: vi.fn(),
}));

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const updateManyMock = vi.mocked(prisma.user.updateMany);
const getStripeClientMock = vi.mocked(getStripeClient);
const customerCreateMock = vi.fn();
const customerDeleteMock = vi.fn();

describe("getOrCreateStripeCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStripeClientMock.mockReturnValue({
      customers: {
        create: customerCreateMock,
        del: customerDeleteMock,
      },
    } as never);
  });

  test("reuses the Customer stored for the authenticated app user", async () => {
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      email: "demo@example.com",
      name: "Demo",
      stripeCustomerId: "cus_existing",
    } as never);

    await expect(getOrCreateStripeCustomer("user-1")).resolves.toBe(
      "cus_existing"
    );
    expect(customerCreateMock).not.toHaveBeenCalled();
  });

  test("creates and conditionally claims one Customer", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "user-1",
      email: "demo@example.com",
      name: "Demo",
      stripeCustomerId: null,
    } as never);
    customerCreateMock.mockResolvedValue({ id: "cus_new" });
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(getOrCreateStripeCustomer("user-1")).resolves.toBe("cus_new");
    expect(customerCreateMock).toHaveBeenCalledWith({
      email: "demo@example.com",
      name: "Demo",
      metadata: { app_user_id: "user-1" },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "user-1", stripeCustomerId: null },
      data: { stripeCustomerId: "cus_new" },
    });
  });

  test("removes and reports the losing Customer in a concurrent race", async () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    findUniqueMock
      .mockResolvedValueOnce({
        id: "user-1",
        email: null,
        name: null,
        stripeCustomerId: null,
      } as never)
      .mockResolvedValueOnce({ stripeCustomerId: "cus_winner" } as never);
    customerCreateMock.mockResolvedValue({ id: "cus_orphan" });
    customerDeleteMock.mockResolvedValue({ id: "cus_orphan", deleted: true });
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(getOrCreateStripeCustomer("user-1")).resolves.toBe(
      "cus_winner"
    );
    expect(customerDeleteMock).toHaveBeenCalledWith("cus_orphan");
    expect(consoleInfo).toHaveBeenCalledWith(
      "Removed a Stripe Customer created during a concurrent race.",
      expect.objectContaining({
        userId: "user-1",
        orphanedCustomerId: "cus_orphan",
        retainedCustomerId: "cus_winner",
      })
    );
  });

  test("fails when the authenticated user has been deleted", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(getOrCreateStripeCustomer("missing")).rejects.toBeInstanceOf(
      StripeCustomerUserNotFoundError
    );
  });
});
