import { beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { isProUser } from "./access";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const findUniqueMock = vi.mocked(prisma.user.findUnique);

describe("isProUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns true for a Pro user", async () => {
    findUniqueMock.mockResolvedValue({ plan: "PRO" } as never);

    await expect(isProUser("user-1")).resolves.toBe(true);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { plan: true },
    });
  });

  test.each([{ plan: "FREE" }, null])(
    "returns false when the user does not have Pro access",
    async (user) => {
      findUniqueMock.mockResolvedValue(user as never);

      await expect(isProUser("user-1")).resolves.toBe(false);
    }
  );
});
