import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemDetail,
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

const itemDetailInclude = {
  ...itemInclude,
  type: {
    select: itemTypeSelect,
  },
} as const;

type DbDashboardItem = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

type DbDashboardItemDetail = Prisma.ItemGetPayload<{
  include: typeof itemDetailInclude;
}>;

type DbDashboardItemType = Prisma.ItemTypeGetPayload<{
  select: typeof itemTypeSelect;
}>;

export type UpdateItemData = {
  title: string;
  description: string | null;
  content: string | null;
  language: string | null;
  url: string | null;
  tags: string[];
};

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

function toDashboardItemDetail(item: DbDashboardItemDetail): DashboardItemDetail {
  return {
    ...toDashboardItem(item),
    contentType: item.contentType,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileMimeType: item.fileMimeType,
    fileSize: item.fileSize,
    lastUsedAt: item.lastUsedAt,
    type: item.type,
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

export async function getItemDetailById(
  userId: string,
  itemId: string
): Promise<DashboardItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId },
    include: itemDetailInclude,
  });

  return item ? toDashboardItemDetail(item) : null;
}

export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateItemData
): Promise<DashboardItemDetail | null> {
  return prisma.$transaction(async (tx) => {
    const existingItem = await tx.item.findFirst({
      where: { id: itemId, userId },
      select: {
        id: true,
        type: {
          select: { slug: true },
        },
      },
    });

    if (!existingItem) {
      return null;
    }

    const tags = normalizeTags(data.tags);
    const supportedData = getSupportedUpdateData(existingItem.type.slug, data);
    const updatedItem = await tx.item.update({
      where: { id: itemId, userId },
      data: {
        title: supportedData.title,
        description: supportedData.description,
        content: supportedData.content,
        language: supportedData.language,
        url: supportedData.url,
        tags: {
          deleteMany: {},
          create: tags.map((tag) => ({
            tag: {
              connectOrCreate: {
                where: {
                  userId_slug: {
                    userId,
                    slug: tag.slug,
                  },
                },
                create: {
                  name: tag.name,
                  slug: tag.slug,
                  userId,
                },
              },
            },
          })),
        },
      },
      include: itemDetailInclude,
    });

    return toDashboardItemDetail(updatedItem);
  });
}

export async function deleteItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  const result = await prisma.item.deleteMany({
    where: { id: itemId, userId },
  });

  return result.count > 0;
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

function normalizeTags(tags: string[]) {
  const normalizedTags = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((name) => ({ name, slug: slugify(name) }));

  return Array.from(
    new Map(normalizedTags.map((tag) => [tag.slug, tag])).values()
  );
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tag"
  );
}

function getSupportedUpdateData(
  itemTypeSlug: string,
  data: UpdateItemData
): UpdateItemData {
  return {
    ...data,
    content: doesTypeSupportContent(itemTypeSlug) ? data.content : null,
    language: doesTypeSupportLanguage(itemTypeSlug) ? data.language : null,
    url: doesTypeSupportUrl(itemTypeSlug) ? data.url : null,
  };
}

function doesTypeSupportContent(slug: string) {
  return ["snippet", "prompt", "command", "note"].includes(slug);
}

function doesTypeSupportLanguage(slug: string) {
  return ["snippet", "command"].includes(slug);
}

function doesTypeSupportUrl(slug: string) {
  return slug === "link";
}
