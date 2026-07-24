import { beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  ActiveProRequiredError,
  getUserEntitlements,
  requireActiveProUser,
} from "./entitlements";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const findUniqueMock = vi.mocked(prisma.user.findUnique);

describe("billing entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads current billing state and delegates to the usage policy", async () => {
    findUniqueMock.mockResolvedValue({
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
    } as never);

    await expect(getUserEntitlements("user-1")).resolves.toMatchObject({
      hasActivePro: true,
      itemLimit: null,
      collectionLimit: null,
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        plan: true,
        subscriptionStatus: true,
      },
    });
  });

  test("fails closed when the user is missing", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(getUserEntitlements("missing-user")).resolves.toMatchObject({
      hasActivePro: false,
      itemLimit: 50,
      collectionLimit: 3,
    });
  });

  test("returns active entitlements from the Pro guard", async () => {
    findUniqueMock.mockResolvedValue({
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
    } as never);

    await expect(requireActiveProUser("user-1")).resolves.toMatchObject({
      hasActivePro: true,
    });
  });

  test.each([
    ["PAST_DUE", "BILLING_PAST_DUE"],
    ["CANCELED", "PRO_REQUIRED"],
    ["INACTIVE", "PRO_REQUIRED"],
  ] as const)(
    "returns a typed %s access failure",
    async (subscriptionStatus, code) => {
      findUniqueMock.mockResolvedValue({
        plan: subscriptionStatus === "INACTIVE" ? "FREE" : "PRO",
        subscriptionStatus,
      } as never);

      const error = await requireActiveProUser("user-1").catch(
        (caught: unknown) => caught
      );

      expect(error).toBeInstanceOf(ActiveProRequiredError);
      expect(error).toMatchObject({ code });
    }
  );
});
