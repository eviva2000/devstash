<<<<<<< HEAD
import type { DashboardItemStats } from "@/features/dashboard/dashboard-types";
import { prisma } from "@/lib/prisma";

/**
 * Aggregate item counts for dashboard stats and sidebar nav badges.
 */
export async function getItemStats(userId: string): Promise<DashboardItemStats> {
  const [total, favorites, pinned, recent] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
    prisma.item.count({ where: { userId, isPinned: true } }),
    prisma.item.count({ where: { userId } }),
  ]);

  return {
    total,
    favorites,
    pinned,
    recent: Math.min(recent, 10),
  };
}

/**
 * Count a user's items by item type for the sidebar type list.
 */
=======
import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemStats,
} from "@/features/dashboard/dashboard-types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const itemInclude = {
  collection: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isFavorite: true,
      _count: {
        select: { items: true },
      },
    },
  },
  tags: {
    include: {
      tag: {
        select: { name: true },
      },
    },
    orderBy: {
      tag: {
        name: "asc",
      },
    },
  },
} as const;

type DbDashboardItem = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

function toDashboardCollection(
  collection: NonNullable<DbDashboardItem["collection"]>
): DashboardCollection {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description ?? "",
    isFavorite: collection.isFavorite,
    itemCount: collection._count.items,
  };
}

function toDashboardItem(item: DbDashboardItem): DashboardItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    typeId: item.typeId,
    collectionId: item.collectionId,
    collection: item.collection ? toDashboardCollection(item.collection) : null,
    content: item.content,
    language: item.language,
    url: item.url,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    tags: item.tags.map(({ tag }) => tag.name),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function getPinnedItems(userId: string): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return items.map(toDashboardItem);
}

export async function getRecentItems(
  userId: string,
  limit: number = 10
): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return items.map(toDashboardItem);
}

export async function getItemStats(
  userId: string
): Promise<DashboardItemStats> {
  const [total, favorites, pinned] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
    prisma.item.count({ where: { userId, isPinned: true } }),
  ]);

  return { total, favorites, pinned };
}

>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
export async function getItemTypeCounts(userId: string) {
  const counts = await prisma.item.groupBy({
    by: ["typeId"],
    where: { userId },
    _count: { _all: true },
  });

  return Object.fromEntries(
    counts.map((count) => [count.typeId, count._count._all])
  );
}
