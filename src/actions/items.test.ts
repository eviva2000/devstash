import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import type { DashboardItemDetail } from "@/features/dashboard/dashboard-types";
import {
  createItem as createItemRecord,
  deleteItem as deleteItemRecord,
  getItemDetailById,
  updateItem as updateItemRecord,
} from "@/lib/db/items";
import { revalidatePath } from "next/cache";

import { createItem, deleteItem, updateItem } from "./items";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/items", () => ({
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  getItemDetailById: vi.fn(),
  updateItem: vi.fn(),
}));

type AuthSession = Session | null;

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<AuthSession>>;
const createItemRecordMock = vi.mocked(createItemRecord);
const deleteItemRecordMock = vi.mocked(deleteItemRecord);
const getItemDetailByIdMock = vi.mocked(getItemDetailById);
const revalidatePathMock = vi.mocked(revalidatePath);
const updateItemRecordMock = vi.mocked(updateItemRecord);

const VALID_ITEM_ID = "cm00000000000000000000000";

describe("createItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated creates", async () => {
    authMock.mockResolvedValue(null);

    await expect(createItem(validCreateInput())).resolves.toEqual({
      success: false,
      error: "You must be signed in to create items.",
    });
    expect(createItemRecordMock).not.toHaveBeenCalled();
  });

  test("returns the first validation error without creating an item", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(
      createItem({
        ...validCreateInput(),
        title: "   ",
      })
    ).resolves.toEqual({
      success: false,
      error: "Title is required.",
    });
    expect(createItemRecordMock).not.toHaveBeenCalled();
  });

  test("requires a URL when creating links", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(
      createItem({
        ...validCreateInput(),
        typeSlug: "link",
        url: "   ",
      })
    ).resolves.toEqual({
      success: false,
      error: "URL is required for links.",
    });
    expect(createItemRecordMock).not.toHaveBeenCalled();
  });

  test("passes normalized create data to the database helper", async () => {
    const createdItem = itemDetail();
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createItemRecordMock.mockResolvedValue(createdItem);

    await expect(
      createItem({
        typeSlug: "snippet",
        title: "  New snippet  ",
        description: "   ",
        content: "  const value = true  ",
        language: "",
        url: "   ",
        tags: [" TypeScript ", "Next.js", "TypeScript"],
      })
    ).resolves.toEqual({ success: true, data: createdItem });
    expect(createItemRecordMock).toHaveBeenCalledWith("user-1", {
      typeSlug: "snippet",
      title: "New snippet",
      description: null,
      content: "const value = true",
      language: null,
      url: null,
      tags: ["TypeScript", "Next.js", "TypeScript"],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/items/snippet");
  });

  test("returns a valid-type error when the database helper cannot resolve the type", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createItemRecordMock.mockResolvedValue(null);

    await expect(createItem(validCreateInput())).resolves.toEqual({
      success: false,
      error: "Choose a valid item type.",
    });
  });

  test("returns a generic error when create fails unexpectedly", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createItemRecordMock.mockRejectedValue(new Error("database unavailable"));

    await expect(createItem(validCreateInput())).resolves.toEqual({
      success: false,
      error: "Unable to create item. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to create item.",
      expect.any(Error)
    );
  });
});

describe("updateItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated updates", async () => {
    authMock.mockResolvedValue(null);

    await expect(updateItem(VALID_ITEM_ID, validUpdateInput())).resolves.toEqual({
      success: false,
      error: "You must be signed in to update items.",
    });
    expect(updateItemRecordMock).not.toHaveBeenCalled();
  });

  test("returns the first validation error without updating the item", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(
      updateItem(VALID_ITEM_ID, {
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
      updateItem(VALID_ITEM_ID, {
        title: "  Updated title  ",
        description: "   ",
        content: "  console.log('devstash')  ",
        language: "",
        url: "   ",
        tags: [" TypeScript ", "Next.js", "TypeScript"],
      })
    ).resolves.toEqual({ success: true, data: updatedItem });
    expect(updateItemRecordMock).toHaveBeenCalledWith("user-1", VALID_ITEM_ID, {
      title: "Updated title",
      description: null,
      content: "console.log('devstash')",
      language: null,
      url: null,
      tags: ["TypeScript", "Next.js", "TypeScript"],
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/items/snippet");
  });

  test("returns an item-not-found error when the database helper returns null", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateItemRecordMock.mockResolvedValue(null);

    await expect(updateItem(VALID_ITEM_ID, validUpdateInput())).resolves.toEqual({
      success: false,
      error: "Item not found.",
    });
  });

  test("returns a generic error when the update fails unexpectedly", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateItemRecordMock.mockRejectedValue(new Error("database unavailable"));

    await expect(updateItem(VALID_ITEM_ID, validUpdateInput())).resolves.toEqual({
      success: false,
      error: "Unable to update item. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to update item.",
      expect.any(Error)
    );
  });
});

describe("deleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated deletes", async () => {
    authMock.mockResolvedValue(null);

    await expect(deleteItem(VALID_ITEM_ID)).resolves.toEqual({
      success: false,
      error: "You must be signed in to delete items.",
    });
    expect(getItemDetailByIdMock).not.toHaveBeenCalled();
    expect(deleteItemRecordMock).not.toHaveBeenCalled();
  });

  test("rejects invalid item IDs before reading from the database", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(deleteItem("item-1")).resolves.toEqual({
      success: false,
      error: "Item not found.",
    });
    expect(getItemDetailByIdMock).not.toHaveBeenCalled();
    expect(deleteItemRecordMock).not.toHaveBeenCalled();
  });

  test("returns an item-not-found error when the item is missing or not owned by the user", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue(null);

    await expect(deleteItem(VALID_ITEM_ID)).resolves.toEqual({
      success: false,
      error: "Item not found.",
    });
    expect(getItemDetailByIdMock).toHaveBeenCalledWith("user-1", VALID_ITEM_ID);
    expect(deleteItemRecordMock).not.toHaveBeenCalled();
  });

  test("deletes the owned item and revalidates affected item lists", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue(itemDetail());
    deleteItemRecordMock.mockResolvedValue(true);

    await expect(deleteItem(VALID_ITEM_ID)).resolves.toEqual({ success: true });
    expect(deleteItemRecordMock).toHaveBeenCalledWith("user-1", VALID_ITEM_ID);
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/items/snippet");
  });

  test("returns an item-not-found error when deletion affects no records", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue(itemDetail());
    deleteItemRecordMock.mockResolvedValue(false);

    await expect(deleteItem(VALID_ITEM_ID)).resolves.toEqual({
      success: false,
      error: "Item not found.",
    });
  });

  test("returns a generic error when deletion fails unexpectedly", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue(itemDetail());
    deleteItemRecordMock.mockRejectedValue(new Error("database unavailable"));

    await expect(deleteItem(VALID_ITEM_ID)).resolves.toEqual({
      success: false,
      error: "Unable to delete item. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to delete item.",
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

function validCreateInput() {
  return {
    typeSlug: "snippet",
    title: "New item",
    description: "Useful item",
    content: "content",
    language: "typescript",
    url: null,
    tags: ["Next.js"],
  };
}

function sessionForUser(userId: string): Session {
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
