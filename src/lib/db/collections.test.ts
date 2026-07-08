import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { prisma } from "@/lib/prisma";

import { createCollection } from "./collections";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const collectionCreateMock = prisma.collection.create as unknown as Mock;
const collectionFindUniqueMock = prisma.collection.findUnique as unknown as Mock;

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
