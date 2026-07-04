import { beforeEach, describe, expect, test, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { deleteItem } from "./items";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      deleteMany: vi.fn(),
    },
  },
}));

const deleteManyMock = vi.mocked(prisma.item.deleteMany);

describe("deleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes only an item owned by the user", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteItem("user-1", "item-1")).resolves.toBe(true);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
  });

  test("returns false when no owned item is deleted", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await expect(deleteItem("user-1", "item-1")).resolves.toBe(false);
  });
});
