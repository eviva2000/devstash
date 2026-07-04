import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { ItemContentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { createItem, deleteItem } from "./items";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    item: {
      deleteMany: vi.fn(),
    },
  },
}));

const transactionMock = prisma.$transaction as unknown as Mock;
const deleteManyMock = vi.mocked(prisma.item.deleteMany);
const transactionClient = {
  itemType: {
    findFirst: vi.fn(),
  },
  item: {
    create: vi.fn(),
  },
};

describe("createItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation((callback) => callback(transactionClient));
  });

  test("creates a text item for the resolved system item type", async () => {
    const createdItem = dbItem();
    transactionClient.itemType.findFirst.mockResolvedValue({
      id: "type-1",
      slug: "snippet",
    });
    transactionClient.item.create.mockResolvedValue(createdItem);

    await expect(
      createItem("user-1", {
        typeSlug: "snippet",
        title: "New snippet",
        description: null,
        content: "const value = true",
        language: "typescript",
        url: null,
        tags: [" TypeScript ", "Next.js", "TypeScript"],
      })
    ).resolves.toEqual({
      id: "item-1",
      title: "New snippet",
      description: "",
      typeId: "type-1",
      collectionId: null,
      collection: null,
      content: "const value = true",
      language: "typescript",
      url: null,
      isFavorite: false,
      isPinned: false,
      tags: ["Next.js", "TypeScript"],
      createdAt: createdItem.createdAt,
      updatedAt: createdItem.updatedAt,
      contentType: ItemContentType.TEXT,
      fileUrl: null,
      fileName: null,
      fileMimeType: null,
      fileSize: null,
      lastUsedAt: null,
      type: createdItem.type,
    });
    expect(transactionClient.itemType.findFirst).toHaveBeenCalledWith({
      where: { slug: "snippet", isSystem: true },
      select: { id: true, slug: true },
    });
    expect(transactionClient.item.create).toHaveBeenCalledWith({
      data: {
        title: "New snippet",
        description: null,
        contentType: ItemContentType.TEXT,
        content: "const value = true",
        language: "typescript",
        url: null,
        userId: "user-1",
        typeId: "type-1",
        tags: {
          create: [
            tagConnectOrCreate("typescript", "TypeScript"),
            tagConnectOrCreate("next-js", "Next.js"),
          ],
        },
      },
      include: expect.any(Object),
    });
  });

  test("creates a URL item for link types and clears unsupported fields", async () => {
    transactionClient.itemType.findFirst.mockResolvedValue({
      id: "type-link",
      slug: "link",
    });
    transactionClient.item.create.mockResolvedValue(
      dbItem({
        contentType: ItemContentType.URL,
        content: null,
        language: null,
        type: {
          id: "type-link",
          name: "Link",
          slug: "link",
          icon: "Link",
          color: "#0ea5e9",
          isSystem: true,
        },
        typeId: "type-link",
        url: "https://example.com",
      })
    );

    await createItem("user-1", {
      typeSlug: "link",
      title: "Useful link",
      description: null,
      content: "ignored",
      language: "ignored",
      url: "https://example.com",
      tags: [],
    });

    expect(transactionClient.item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentType: ItemContentType.URL,
        content: null,
        language: null,
        url: "https://example.com",
      }),
      include: expect.any(Object),
    });
  });

  test("returns null when the requested system type does not exist", async () => {
    transactionClient.itemType.findFirst.mockResolvedValue(null);

    await expect(
      createItem("user-1", {
        typeSlug: "snippet",
        title: "New snippet",
        description: null,
        content: null,
        language: null,
        url: null,
        tags: [],
      })
    ).resolves.toBeNull();
    expect(transactionClient.item.create).not.toHaveBeenCalled();
  });
});

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

function tagConnectOrCreate(slug: string, name: string) {
  return {
    tag: {
      connectOrCreate: {
        where: {
          userId_slug: {
            userId: "user-1",
            slug,
          },
        },
        create: {
          name,
          slug,
          userId: "user-1",
        },
      },
    },
  };
}

type MockDbItem = {
  id: string;
  title: string;
  description: string | null;
  typeId: string;
  collectionId: string | null;
  collection: null;
  content: string | null;
  language: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  tags: Array<{ tag: { name: string } }>;
  createdAt: Date;
  updatedAt: Date;
  contentType: (typeof ItemContentType)[keyof typeof ItemContentType];
  fileUrl: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
  lastUsedAt: Date | null;
  type: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
    isSystem: boolean;
  };
};

function dbItem(overrides: Partial<MockDbItem> = {}): MockDbItem {
  return {
    ...baseDbItem(),
    ...overrides,
  };
}

function baseDbItem(): MockDbItem {
  const createdAt = new Date("2026-07-04T10:00:00.000Z");
  const updatedAt = new Date("2026-07-04T10:00:00.000Z");

  return {
    id: "item-1",
    title: "New snippet",
    description: null,
    typeId: "type-1",
    collectionId: null,
    collection: null,
    content: "const value = true",
    language: "typescript",
    url: null,
    isFavorite: false,
    isPinned: false,
    tags: [
      { tag: { name: "Next.js" } },
      { tag: { name: "TypeScript" } },
    ],
    createdAt,
    updatedAt,
    contentType: ItemContentType.TEXT,
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
