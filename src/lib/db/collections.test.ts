import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  createCollection,
  deleteCollection,
  getCollectionById,
  getGlobalSearchCollections,
  updateCollection,
} from "./collections";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const collectionCreateMock = prisma.collection.create as unknown as Mock;
const collectionDeleteManyMock = prisma.collection.deleteMany as unknown as Mock;
const collectionFindManyMock = prisma.collection.findMany as unknown as Mock;
const collectionFindFirstMock = prisma.collection.findFirst as unknown as Mock;
const collectionFindUniqueMock = prisma.collection.findUnique as unknown as Mock;
const collectionUpdateMock = prisma.collection.update as unknown as Mock;

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates a user-scoped collection with a slug from the name", async () => {
    const createdCollection = dbCollection();
    collectionFindUniqueMock.mockResolvedValue(null);
    collectionCreateMock.mockResolvedValue(createdCollection);

    await expect(
      createCollection("user-1", {
        name: "API Notes",
        description: "Useful API references",
      })
    ).resolves.toEqual({
      id: "collection-1",
      name: "API Notes",
      slug: "api-notes",
      description: "Useful API references",
      isFavorite: false,
      itemCount: 0,
      dominantType: null,
      types: [],
      createdAt: createdCollection.createdAt,
      updatedAt: createdCollection.updatedAt,
    });
    expect(collectionFindUniqueMock).toHaveBeenCalledWith({
      where: {
        userId_slug: {
          userId: "user-1",
          slug: "api-notes",
        },
      },
      select: { id: true },
    });
    expect(collectionCreateMock).toHaveBeenCalledWith({
      data: {
        name: "API Notes",
        slug: "api-notes",
        description: "Useful API references",
        userId: "user-1",
      },
      include: expect.any(Object),
    });
  });

  test("adds a suffix when the generated slug already exists for the user", async () => {
    collectionFindUniqueMock
      .mockResolvedValueOnce({ id: "existing-collection" })
      .mockResolvedValueOnce(null);
    collectionCreateMock.mockResolvedValue(
      dbCollection({
        id: "collection-2",
        slug: "api-notes-2",
      })
    );

    await createCollection("user-1", {
      name: "API Notes",
      description: null,
    });

    expect(collectionFindUniqueMock).toHaveBeenNthCalledWith(1, {
      where: {
        userId_slug: {
          userId: "user-1",
          slug: "api-notes",
        },
      },
      select: { id: true },
    });
    expect(collectionFindUniqueMock).toHaveBeenNthCalledWith(2, {
      where: {
        userId_slug: {
          userId: "user-1",
          slug: "api-notes-2",
        },
      },
      select: { id: true },
    });
    expect(collectionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "api-notes-2",
          userId: "user-1",
        }),
      })
    );
  });
});

describe("getCollectionById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("fetches only a collection owned by the user", async () => {
    const collection = dbCollection({
      id: "collection-2",
      name: "Workflows",
      slug: "workflows",
    });
    collectionFindFirstMock.mockResolvedValue(collection);

    await expect(
      getCollectionById("user-1", "collection-2")
    ).resolves.toEqual({
      id: "collection-2",
      name: "Workflows",
      slug: "workflows",
      description: "Useful API references",
      isFavorite: false,
      itemCount: 0,
      dominantType: null,
      types: [],
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    });
    expect(collectionFindFirstMock).toHaveBeenCalledWith({
      where: { id: "collection-2", userId: "user-1" },
      include: expect.any(Object),
    });
  });

  test("returns null when the collection is not owned by the user", async () => {
    collectionFindFirstMock.mockResolvedValue(null);

    await expect(getCollectionById("user-1", "collection-2")).resolves.toBe(
      null
    );
  });
});

describe("getGlobalSearchCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("fetches every user collection with minimal searchable data", async () => {
    collectionFindManyMock.mockResolvedValue([
      {
        id: "collection-1",
        name: "API Notes",
        _count: { itemLinks: 3 },
      },
    ]);

    await expect(getGlobalSearchCollections("user-1")).resolves.toEqual([
      {
        id: "collection-1",
        name: "API Notes",
        itemCount: 3,
      },
    ]);
    expect(collectionFindManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: { itemLinks: true },
        },
      },
    });
  });
});

describe("updateCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("updates only a collection owned by the user", async () => {
    const updatedCollection = dbCollection({
      id: "collection-2",
      name: "Updated Workflows",
      slug: "updated-workflows",
      description: "Updated metadata",
    });
    collectionFindFirstMock.mockResolvedValue({ id: "collection-2" });
    collectionFindUniqueMock.mockResolvedValue(null);
    collectionUpdateMock.mockResolvedValue(updatedCollection);

    await expect(
      updateCollection("user-1", "collection-2", {
        name: "Updated Workflows",
        description: "Updated metadata",
      })
    ).resolves.toEqual({
      id: "collection-2",
      name: "Updated Workflows",
      slug: "updated-workflows",
      description: "Updated metadata",
      isFavorite: false,
      itemCount: 0,
      dominantType: null,
      types: [],
      createdAt: updatedCollection.createdAt,
      updatedAt: updatedCollection.updatedAt,
    });
    expect(collectionFindFirstMock).toHaveBeenCalledWith({
      where: { id: "collection-2", userId: "user-1" },
      select: { id: true },
    });
    expect(collectionUpdateMock).toHaveBeenCalledWith({
      where: { id: "collection-2" },
      data: {
        name: "Updated Workflows",
        slug: "updated-workflows",
        description: "Updated metadata",
      },
      include: expect.any(Object),
    });
  });

  test("returns null when the collection is not owned by the user", async () => {
    collectionFindFirstMock.mockResolvedValue(null);

    await expect(
      updateCollection("user-1", "collection-2", {
        name: "Updated Workflows",
        description: null,
      })
    ).resolves.toBe(null);
    expect(collectionUpdateMock).not.toHaveBeenCalled();
  });

  test("allows the current collection to keep its existing generated slug", async () => {
    collectionFindFirstMock.mockResolvedValue({ id: "collection-2" });
    collectionFindUniqueMock.mockResolvedValue({ id: "collection-2" });
    collectionUpdateMock.mockResolvedValue(
      dbCollection({
        id: "collection-2",
        slug: "api-notes",
      })
    );

    await updateCollection("user-1", "collection-2", {
      name: "API Notes",
      description: null,
    });

    expect(collectionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "api-notes",
        }),
      })
    );
  });
});

describe("deleteCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("deletes only a collection owned by the user", async () => {
    collectionDeleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteCollection("user-1", "collection-2")).resolves.toBe(
      true
    );
    expect(collectionDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "collection-2", userId: "user-1" },
    });
  });

  test("returns false when no owned collection is deleted", async () => {
    collectionDeleteManyMock.mockResolvedValue({ count: 0 });

    await expect(deleteCollection("user-1", "collection-2")).resolves.toBe(
      false
    );
  });
});

function dbCollection(
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isFavorite: boolean;
    itemLinks: [];
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  const createdAt = new Date("2026-07-08T10:00:00.000Z");
  const updatedAt = new Date("2026-07-08T10:00:00.000Z");

  return {
    id: "collection-1",
    name: "API Notes",
    slug: "api-notes",
    description: "Useful API references",
    isFavorite: false,
    itemLinks: [],
    createdAt,
    updatedAt,
    ...overrides,
  };
}
