import { beforeEach, describe, expect, test, vi } from "vitest";

import { auth } from "@/auth";
import type { DashboardItemDetail } from "@/features/dashboard/dashboard-types";
import { updateItem as updateItemRecord } from "@/lib/db/items";

import { updateItem } from "./items";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/items", () => ({
  updateItem: vi.fn(),
}));

const authMock = vi.mocked(auth);
const updateItemRecordMock = vi.mocked(updateItemRecord);

describe("updateItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated updates", async () => {
    authMock.mockResolvedValue(null);

    await expect(updateItem("item-1", validUpdateInput())).resolves.toEqual({
      success: false,
      error: "You must be signed in to update items.",
    });
    expect(updateItemRecordMock).not.toHaveBeenCalled();
  });

  test("returns the first validation error without updating the item", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(
      updateItem("item-1", {
        ...validUpdateInput(),
        title: "   ",
      })
    ).resolves.toEqual({
      success: false,
      error: "Title is required.",
    });
    expect(updateItemRecordMock).not.toHaveBeenCalled();
  });

  test("passes normalized update data to the database helper", async () => {
    const updatedItem = itemDetail();
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateItemRecordMock.mockResolvedValue(updatedItem);

    await expect(
      updateItem("item-1", {
        title: "  Updated title  ",
        description: "   ",
        content: "  console.log('devstash')  ",
        language: "",
        url: "   ",
        tags: [" TypeScript ", "Next.js", "TypeScript"],
      })
    ).resolves.toEqual({ success: true, data: updatedItem });
    expect(updateItemRecordMock).toHaveBeenCalledWith("user-1", "item-1", {
      title: "Updated title",
      description: null,
      content: "console.log('devstash')",
      language: null,
      url: null,
      tags: ["TypeScript", "Next.js"],
    });
  });

  test("returns an item-not-found error when the database helper returns null", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateItemRecordMock.mockResolvedValue(null);

    await expect(updateItem("missing-item", validUpdateInput())).resolves.toEqual({
      success: false,
      error: "Item not found.",
    });
  });

  test("returns a generic error when the update fails unexpectedly", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateItemRecordMock.mockRejectedValue(new Error("database unavailable"));

    await expect(updateItem("item-1", validUpdateInput())).resolves.toEqual({
      success: false,
      error: "Unable to update item. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to update item.",
      expect.any(Error)
    );
  });
});

function validUpdateInput() {
  return {
    title: "Updated item",
    description: "Useful item",
    content: "content",
    language: "typescript",
    url: null,
    tags: ["Next.js"],
  };
}

function sessionForUser(userId: string): Awaited<ReturnType<typeof auth>> {
  return {
    user: {
      id: userId,
      name: "Demo User",
      email: "demo@devstash.io",
      image: null,
    },
    expires: "2026-07-03T12:00:00.000Z",
  };
}

function itemDetail(): DashboardItemDetail {
  const createdAt = new Date("2026-07-03T10:00:00.000Z");
  const updatedAt = new Date("2026-07-03T10:15:00.000Z");

  return {
    id: "item-1",
    title: "Updated title",
    description: "",
    typeId: "type-1",
    collectionId: null,
    collection: null,
    content: "console.log('devstash')",
    language: null,
    url: null,
    isFavorite: false,
    isPinned: false,
    tags: ["TypeScript", "Next.js"],
    createdAt,
    updatedAt,
    contentType: "text",
    fileUrl: null,
    fileName: null,
    fileMimeType: null,
    fileSize: null,
    lastUsedAt: null,
    type: {
      id: "type-1",
      name: "Snippet",
      slug: "snippet",
      icon: "Code",
      color: "#22c55e",
      isSystem: true,
    },
  };
}
