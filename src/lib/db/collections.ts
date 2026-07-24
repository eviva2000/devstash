import type { Prisma } from "@/generated/prisma/client";
import type {
  DashboardCollection,
  GlobalSearchCollection,
} from "@/features/dashboard/dashboard-types";
import { prisma } from "@/lib/prisma";
import { validateQueryLimit } from "@/lib/db/query-limits";
import { getUsageLimits } from "@/lib/usage-limits";

const MAX_COLLECTION_QUERY_LIMIT = 100;

const collectionInclude = {
  itemLinks: {
    include: {
      item: {
        include: {
          type: {
            select: { id: true, name: true, slug: true, icon: true, color: true },
          },
        },
      },
    },
  },
} as const;

type CollectionWithItems = Prisma.CollectionGetPayload<{
  include: typeof collectionInclude;
}>;

export type CreateCollectionData = {
  name: string;
  description: string | null;
};

export type UpdateCollectionData = CreateCollectionData;

export type CreateCollectionFailure = {
  success: false;
  code: "COLLECTION_LIMIT_REACHED";
};

export function isCreateCollectionFailure(
  result: DashboardCollection | CreateCollectionFailure
): result is CreateCollectionFailure {
  return "success" in result && result.success === false;
}

function toDashboardCollection(
  collection: CollectionWithItems
): DashboardCollection & {
  types: Array<{
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
    count: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
} {
  const typeCountMap = new Map<
    string,
    { count: number; type: CollectionWithItems["itemLinks"][number]["item"]["type"] }
  >();

  collection.itemLinks.forEach(({ item }) => {
    const existing = typeCountMap.get(item.typeId);

    if (existing) {
      existing.count++;
      return;
    }

    typeCountMap.set(item.typeId, { count: 1, type: item.type });
  });

  const typeEntries = Array.from(typeCountMap.values());
  const dominantType =
    typeEntries.length > 0
      ? typeEntries.reduce((prev, current) =>
          current.count > prev.count ? current : prev
        ).type
      : null;

  const types = typeEntries.map((entry) => ({
    id: entry.type.id,
    name: entry.type.name,
    slug: entry.type.slug,
    icon: entry.type.icon,
    color: entry.type.color,
    count: entry.count,
  }));

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description ?? "",
    isFavorite: collection.isFavorite,
    itemCount: collection.itemLinks.length,
    dominantType,
    types,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

/**
 * Get recent collections with item counts and type distribution
 * Calculates the dominant item type for each collection
 */
export async function getRecentCollections(userId: string, limit: number = 6) {
  const take = validateQueryLimit(limit, {
    max: MAX_COLLECTION_QUERY_LIMIT,
    name: "Recent collections limit",
  });

  const collections = await prisma.collection.findMany({
    where: { userId },
    take,
    orderBy: { updatedAt: "desc" },
    include: collectionInclude,
  });

  return collections.map(toDashboardCollection);
}

/**
 * Get favorite collections for the sidebar.
 */
export async function getFavoriteCollections(
  userId: string,
  limit: number = 5
) {
  const take = validateQueryLimit(limit, {
    max: MAX_COLLECTION_QUERY_LIMIT,
    name: "Favorite collections limit",
  });

  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    take,
    orderBy: { updatedAt: "desc" },
    include: collectionInclude,
  });

  return collections.map(toDashboardCollection);
}

export async function getCollections(userId: string) {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: collectionInclude,
  });

  return collections.map(toDashboardCollection);
}

export async function getGlobalSearchCollections(
  userId: string
): Promise<GlobalSearchCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: { itemLinks: true },
      },
    },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    itemCount: collection._count.itemLinks,
  }));
}

export async function getCollectionById(userId: string, collectionId: string) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: collectionInclude,
  });

  return collection ? toDashboardCollection(collection) : null;
}

export async function createCollection(
  userId: string,
  data: CreateCollectionData
): Promise<DashboardCollection | CreateCollectionFailure> {
  return runSerializableTransaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
      },
    });
    const entitlements = getUsageLimits(user);

    if (entitlements.collectionLimit !== null) {
      const collectionCount = await tx.collection.count({ where: { userId } });

      if (collectionCount >= entitlements.collectionLimit) {
        return { success: false, code: "COLLECTION_LIMIT_REACHED" };
      }
    }

    const slug = await getUniqueCollectionSlug(
      userId,
      data.name,
      undefined,
      tx
    );
    const collection = await tx.collection.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        userId,
      },
      include: collectionInclude,
    });

    return toDashboardCollection(collection);
  });
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  data: UpdateCollectionData
): Promise<DashboardCollection | null> {
  const existingCollection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  });

  if (!existingCollection) {
    return null;
  }

  const slug = await getUniqueCollectionSlug(userId, data.name, collectionId);
  const collection = await prisma.collection.update({
    where: { id: collectionId },
    data: {
      name: data.name,
      slug,
      description: data.description,
    },
    include: collectionInclude,
  });

  return toDashboardCollection(collection);
}

export async function deleteCollection(
  userId: string,
  collectionId: string
): Promise<boolean> {
  const deletedCollection = await prisma.collection.deleteMany({
    where: { id: collectionId, userId },
  });

  return deletedCollection.count > 0;
}

/**
 * Get system item types with colors and icons.
 * Used for displaying type information in the dashboard sidebar.
 */
export async function getItemTypes() {
  return await prisma.itemType.findMany({
    where: { isSystem: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Aggregate collection counts for the dashboard stats cards.
 */
export async function getCollectionStats(userId: string) {
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);

  return { total, favorites };
}

async function getUniqueCollectionSlug(
  userId: string,
  name: string,
  excludeCollectionId?: string,
  client: Pick<Prisma.TransactionClient, "collection"> = prisma
) {
  const baseSlug = slugify(name, "collection");
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existingCollection = await client.collection.findUnique({
      where: {
        userId_slug: {
          userId,
          slug,
        },
      },
      select: { id: true },
    });

    if (
      !existingCollection ||
      existingCollection.id === excludeCollectionId
    ) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}

function slugify(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

async function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Serializable collection transaction retry limit exceeded.");
}

function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
