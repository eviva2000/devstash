import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemStats,
} from "@/features/dashboard/dashboard-types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validateQueryLimit } from "@/lib/db/query-limits";

const MAX_ITEM_QUERY_LIMIT = 50;

const itemTypeSelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  color: true,
  isSystem: true,
} as const;

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

type DbDashboardItemType = Prisma.ItemTypeGetPayload<{
  select: typeof itemTypeSelect;
}>;

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
  const take = validateQueryLimit(limit, {
    max: MAX_ITEM_QUERY_LIMIT,
    name: "Recent items limit",
  });

  const items = await prisma.item.findMany({
    where: { userId },
    take,
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return items.map(toDashboardItem);
}

export async function getItemTypeBySlug(
  slug: string
): Promise<DbDashboardItemType | null> {
  const slugCandidates = getItemTypeSlugCandidates(slug);
  const itemTypes = await prisma.itemType.findMany({
    where: {
      isSystem: true,
      slug: { in: slugCandidates },
    },
    select: itemTypeSelect,
  });

  return (
    slugCandidates
      .map((candidate) => itemTypes.find((type) => type.slug === candidate))
      .find((type) => type !== undefined) ?? null
  );
}

export async function getItemsByTypeSlug(
  userId: string,
  slug: string,
  limit: number = MAX_ITEM_QUERY_LIMIT
): Promise<{
  itemType: DbDashboardItemType | null;
  items: DashboardItem[];
}> {
  const take = validateQueryLimit(limit, {
    max: MAX_ITEM_QUERY_LIMIT,
    name: "Items by type limit",
  });
  const itemType = await getItemTypeBySlug(slug);

  if (!itemType) {
    return { itemType: null, items: [] };
  }

  const items = await prisma.item.findMany({
    where: { userId, typeId: itemType.id },
    take,
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return { itemType, items: items.map(toDashboardItem) };
}

export async function getItemStats(
  userId: string
): Promise<DashboardItemStats> {
  const [total, favorites, pinned, recent] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
    prisma.item.count({ where: { userId, isPinned: true } }),
    prisma.item.count({ where: { userId, updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ]);

  return { total, favorites, pinned, recent };
}

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

function getItemTypeSlugCandidates(slug: string) {
  const candidates = [slug];

  if (slug.endsWith("s") && slug.length > 1) {
    candidates.push(slug.slice(0, -1));
  }

  return Array.from(new Set(candidates));
}
