import type { Prisma } from "@/generated/prisma/client";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import { prisma } from "@/lib/prisma";
import { validateQueryLimit } from "@/lib/db/query-limits";

const MAX_COLLECTION_QUERY_LIMIT = 100;

const collectionInclude = {
  items: {
    include: {
      type: {
        select: { id: true, name: true, slug: true, icon: true, color: true },
      },
    },
  },
} as const;

type CollectionWithItems = Prisma.CollectionGetPayload<{
  include: typeof collectionInclude;
}>;

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
    { count: number; type: CollectionWithItems["items"][number]["type"] }
  >();

  collection.items.forEach((item) => {
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
    itemCount: collection.items.length,
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
