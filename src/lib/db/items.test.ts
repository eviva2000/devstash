import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { ItemContentType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  createItem,
  createPendingItemUpload,
  deleteItem,
  deletePendingItemUpload,
  getGlobalSearchItems,
  getItemsByCollectionId,
  getPendingItemUpload,
} from "./items";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    item: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    itemUpload: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const transactionMock = prisma.$transaction as unknown as Mock;
const deleteManyMock = vi.mocked(prisma.item.deleteMany);
const itemFindManyMock = vi.mocked(prisma.item.findMany);
const itemUploadCreateMock = vi.mocked(prisma.itemUpload.create);
const itemUploadDeleteMock = vi.mocked(prisma.itemUpload.delete);
const itemUploadFindFirstMock = vi.mocked(prisma.itemUpload.findFirst);
const transactionClient = {
  itemType: {
    findFirst: vi.fn(),
  },
  item: {
    create: vi.fn(),
  },
  collection: {
    findMany: vi.fn(),
  },
  itemUpload: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
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
      collectionIds: [],
      collections: [],
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
        fileUrl: null,
        fileName: null,
        fileMimeType: null,
        fileSize: null,
        userId: "user-1",
        typeId: "type-1",
        collectionId: null,
        collections: {
          create: [],
        },
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
        fileUrl: null,
        fileName: null,
        fileMimeType: null,
        fileSize: null,
      }),
      include: expect.any(Object),
    });
  });

  test("creates collection memberships for owned collections", async () => {
    transactionClient.itemType.findFirst.mockResolvedValue({
      id: "type-1",
      slug: "snippet",
    });
    transactionClient.collection.findMany.mockResolvedValue([
      { id: "collection-1" },
      { id: "collection-2" },
    ]);
    transactionClient.item.create.mockResolvedValue(
      dbItem({
        collectionId: "collection-1",
        collections: [
          {
            collection: dbCollection({
              id: "collection-1",
              name: "API Notes",
              slug: "api-notes",
            }),
          },
          {
            collection: dbCollection({
              id: "collection-2",
              name: "Workflows",
              slug: "workflows",
            }),
          },
        ],
      })
    );

    await expect(
      createItem("user-1", {
        typeSlug: "snippet",
        title: "New snippet",
        description: null,
        content: "const value = true",
        language: "typescript",
        url: null,
        tags: [],
        collectionIds: ["collection-1", "collection-2", "collection-1"],
      })
    ).resolves.toMatchObject({
      collectionId: "collection-1",
      collectionIds: ["collection-1", "collection-2"],
      collections: [
        expect.objectContaining({ id: "collection-1" }),
        expect.objectContaining({ id: "collection-2" }),
      ],
    });
    expect(transactionClient.collection.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["collection-1", "collection-2"] },
        userId: "user-1",
      },
      select: { id: true },
    });
    expect(transactionClient.item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        collectionId: "collection-1",
        collections: {
          create: [
            { collection: { connect: { id: "collection-1" } } },
            { collection: { connect: { id: "collection-2" } } },
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  test("creates a file item with uploaded metadata and clears unsupported fields", async () => {
    transactionClient.itemType.findFirst.mockResolvedValue({
      id: "type-file",
      slug: "file",
    });
    transactionClient.itemUpload.findFirst.mockResolvedValue(itemUpload());
    transactionClient.itemUpload.updateMany.mockResolvedValue({ count: 1 });
    transactionClient.item.create.mockResolvedValue(
      dbItem({
        contentType: ItemContentType.FILE,
        content: null,
        language: null,
        type: {
          id: "type-file",
          name: "File",
          slug: "file",
          icon: "File",
          color: "#6b7280",
          isSystem: true,
        },
        typeId: "type-file",
        fileUrl: "users/user-1/upload.pdf",
        fileName: "upload.pdf",
        fileMimeType: "application/pdf",
        fileSize: 2048,
      })
    );

    await createItem("user-1", {
      typeSlug: "file",
      title: "Upload",
      description: null,
      content: "ignored",
      language: "ignored",
      url: "https://example.com",
      tags: [],
      file: {
        uploadToken: "cm11111111111111111111111",
      },
    });

    expect(transactionClient.itemUpload.findFirst).toHaveBeenCalledWith({
      where: {
        id: "cm11111111111111111111111",
        userId: "user-1",
        itemTypeSlug: "file",
        consumedAt: null,
      },
    });
    expect(transactionClient.itemUpload.updateMany).toHaveBeenCalledWith({
      where: {
        id: "cm11111111111111111111111",
        userId: "user-1",
        itemTypeSlug: "file",
        consumedAt: null,
      },
      data: {
        consumedAt: expect.any(Date),
      },
    });
    expect(transactionClient.item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentType: ItemContentType.FILE,
        content: null,
        language: null,
        url: null,
        fileUrl: "users/user-1/upload.pdf",
        fileName: "upload.pdf",
        fileMimeType: "application/pdf",
        fileSize: 2048,
      }),
      include: expect.any(Object),
    });
  });

  test("returns null when a file upload token is missing or already consumed", async () => {
    transactionClient.itemType.findFirst.mockResolvedValue({
      id: "type-file",
      slug: "file",
    });
    transactionClient.itemUpload.findFirst.mockResolvedValue(null);

    await expect(
      createItem("user-1", {
        typeSlug: "file",
        title: "Upload",
        description: null,
        content: null,
        language: null,
        url: null,
        tags: [],
        file: {
          uploadToken: "cm11111111111111111111111",
        },
      })
    ).resolves.toBeNull();
    expect(transactionClient.item.create).not.toHaveBeenCalled();
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

describe("pending item uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a pending upload record and returns a client token", async () => {
    itemUploadCreateMock.mockResolvedValue(itemUpload());

    await expect(
      createPendingItemUpload("user-1", "file", {
        fileUrl: "users/user-1/upload.pdf",
        fileName: "upload.pdf",
        fileMimeType: "application/pdf",
        fileSize: 2048,
      })
    ).resolves.toEqual({
      uploadToken: "cm11111111111111111111111",
      fileName: "upload.pdf",
      fileMimeType: "application/pdf",
      fileSize: 2048,
    });
    expect(itemUploadCreateMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        itemTypeSlug: "file",
        fileUrl: "users/user-1/upload.pdf",
        fileName: "upload.pdf",
        fileMimeType: "application/pdf",
        fileSize: 2048,
      },
    });
  });

  test("reads and deletes only unconsumed uploads owned by the user", async () => {
    itemUploadFindFirstMock.mockResolvedValue(itemUpload());
    itemUploadDeleteMock.mockResolvedValue(itemUpload());

    await expect(
      getPendingItemUpload("user-1", "cm11111111111111111111111")
    ).resolves.toEqual({
      fileUrl: "users/user-1/upload.pdf",
      fileName: "upload.pdf",
      fileMimeType: "application/pdf",
      fileSize: 2048,
    });
    await expect(
      deletePendingItemUpload("user-1", "cm11111111111111111111111")
    ).resolves.toEqual({
      fileUrl: "users/user-1/upload.pdf",
      fileName: "upload.pdf",
      fileMimeType: "application/pdf",
      fileSize: 2048,
    });
    expect(itemUploadFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "cm11111111111111111111111",
        userId: "user-1",
        consumedAt: null,
      },
    });
    expect(itemUploadDeleteMock).toHaveBeenCalledWith({
      where: { id: "cm11111111111111111111111" },
    });
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

describe("getItemsByCollectionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("fetches user-scoped items from primary and linked collection memberships", async () => {
    const item = dbItem({
      collectionId: "collection-1",
      collection: dbCollection(),
      collections: [{ collection: dbCollection() }],
    });
    itemFindManyMock.mockResolvedValue([item]);

    await expect(
      getItemsByCollectionId("user-1", "collection-1")
    ).resolves.toEqual([
      expect.objectContaining({
        id: "item-1",
        collectionId: "collection-1",
        collectionIds: ["collection-1"],
        collections: [expect.objectContaining({ id: "collection-1" })],
      }),
    ]);
    expect(itemFindManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        OR: [
          { collectionId: "collection-1" },
          {
            collections: {
              some: { collectionId: "collection-1" },
            },
          },
        ],
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: expect.any(Object),
    });
  });
});

describe("getGlobalSearchItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("fetches every user item with minimal searchable data", async () => {
    itemFindManyMock.mockResolvedValue([
      dbItem({
        content: "const first = true;\nconst second = false;",
        description: "A description that should not replace content.",
      }),
    ]);

    await expect(getGlobalSearchItems("user-1")).resolves.toEqual([
      {
        id: "item-1",
        title: "New snippet",
        preview: "const first = true; const second = false;",
        type: {
          id: "type-1",
          name: "Snippet",
          slug: "snippet",
          icon: "Code",
          color: "#22c55e",
          isSystem: true,
        },
      },
    ]);
    expect(itemFindManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        url: true,
        fileName: true,
        type: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
            isSystem: true,
          },
        },
      },
    });
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
  collection: MockDbCollection | null;
  collections: Array<{ collection: MockDbCollection }>;
  content: string | null;
  language: string | null;
  url: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  userId: string;
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

type MockDbCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  _count: { itemLinks: number };
};

function dbItem(overrides: Partial<MockDbItem> = {}): MockDbItem {
  return {
    ...baseDbItem(),
    ...overrides,
  };
}

function dbCollection(
  overrides: Partial<MockDbCollection> = {}
): MockDbCollection {
  return {
    id: "collection-1",
    name: "API Notes",
    slug: "api-notes",
    description: null,
    isFavorite: false,
    _count: { itemLinks: 2 },
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
    collections: [],
    content: "const value = true",
    language: "typescript",
    url: null,
    isFavorite: false,
    isPinned: false,
    userId: "user-1",
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

function itemUpload() {
  return {
    id: "cm11111111111111111111111",
    userId: "user-1",
    itemTypeSlug: "file",
    fileUrl: "users/user-1/upload.pdf",
    fileName: "upload.pdf",
    fileMimeType: "application/pdf",
    fileSize: 2048,
    consumedAt: null,
    createdAt: new Date("2026-07-06T10:00:00.000Z"),
    updatedAt: new Date("2026-07-06T10:00:00.000Z"),
  };
}
