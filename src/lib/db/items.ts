import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemDetail,
  DashboardItemStats,
  GlobalSearchItem,
} from "@/features/dashboard/dashboard-types";
import { ItemContentType } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { validateQueryLimit } from "@/lib/db/query-limits";
import {
  doesTypeSupportContent,
  doesTypeSupportFile,
  doesTypeSupportLanguage,
  doesTypeSupportUrl,
} from "@/lib/item-type-capabilities";
import type {
  StoredFileMetadata,
  UploadedFileMetadata,
  UploadItemType,
} from "@/lib/file-uploads";
import { getUsageLimits } from "@/lib/usage-limits";

const MAX_ITEM_QUERY_LIMIT = 50;

const itemTypeSelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  color: true,
  isSystem: true,
} as const;

const itemCollectionSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isFavorite: true,
  _count: {
    select: { itemLinks: true },
  },
} as const;

const itemInclude = {
  collection: {
    select: itemCollectionSelect,
  },
  collections: {
    include: {
      collection: {
        select: itemCollectionSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
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

const globalSearchItemSelect = {
  id: true,
  title: true,
  description: true,
  content: true,
  url: true,
  fileName: true,
  type: {
    select: itemTypeSelect,
  },
} as const;

type DbDashboardItem = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

type DbDashboardItemDetail = Prisma.ItemGetPayload<{
  include: typeof itemDetailInclude;
}>;

type DbGlobalSearchItem = Prisma.ItemGetPayload<{
  select: typeof globalSearchItemSelect;
}>;

type DbDashboardItemType = Prisma.ItemTypeGetPayload<{
  select: typeof itemTypeSelect;
}>;

type DbItemUpload = Prisma.ItemUploadGetPayload<object>;

export type UpdateItemData = {
  title: string;
  description: string | null;
  content: string | null;
  language: string | null;
  url: string | null;
  tags: string[];
  collectionIds?: string[];
};

export type CreateItemData = UpdateItemData & {
  typeSlug: string;
  file?: { uploadToken: string } | null;
};

export type CreateItemFailureCode =
  | "ITEM_LIMIT_REACHED"
  | "PRO_REQUIRED"
  | "BILLING_PAST_DUE"
  | "INVALID_ITEM_TYPE"
  | "INVALID_COLLECTION"
  | "INVALID_UPLOAD";

export type CreateItemFailure = {
  success: false;
  code: CreateItemFailureCode;
};

export type DashboardItemsPage = {
  items: DashboardItem[];
  nextCursor: string | null;
};

export function isCreateItemFailure(
  result: DashboardItemDetail | CreateItemFailure
): result is CreateItemFailure {
  return "success" in result && result.success === false;
}

function toDashboardCollection(
  collection:
    | NonNullable<DbDashboardItem["collection"]>
    | DbDashboardItem["collections"][number]["collection"]
): DashboardCollection {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description ?? "",
    isFavorite: collection.isFavorite,
    itemCount: collection._count.itemLinks,
  };
}

function toDashboardItem(item: DbDashboardItem): DashboardItem {
  const collections = getDashboardCollections(item);
  const primaryCollection =
    collections[0] ?? (item.collection ? toDashboardCollection(item.collection) : null);

  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    typeId: item.typeId,
    collectionId: primaryCollection?.id ?? null,
    collection: primaryCollection,
    collectionIds: collections.map((collection) => collection.id),
    collections,
    content: item.content,
    language: item.language,
    url: item.url,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileMimeType: item.fileMimeType,
    fileSize: item.fileSize,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    tags: item.tags.map(({ tag }) => tag.name),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getDashboardCollections(item: DbDashboardItem): DashboardCollection[] {
  const collections = item.collections.map(({ collection }) =>
    toDashboardCollection(collection)
  );

  if (
    item.collection &&
    !collections.some((collection) => collection.id === item.collection?.id)
  ) {
    collections.unshift(toDashboardCollection(item.collection));
  }

  return collections;
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

function toGlobalSearchItem(item: DbGlobalSearchItem): GlobalSearchItem {
  return {
    id: item.id,
    title: item.title,
    preview: getGlobalSearchPreview(item),
    type: item.type,
  };
}

function getGlobalSearchPreview(item: DbGlobalSearchItem) {
  const previewSource =
    item.content ?? item.description ?? item.url ?? item.fileName ?? "";

  return previewSource.replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function getPinnedItems(userId: string): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return items.map(toDashboardItem);
}

export async function getGlobalSearchItems(
  userId: string
): Promise<GlobalSearchItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: globalSearchItemSelect,
  });

  return items.map(toGlobalSearchItem);
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
  nextCursor: string | null;
}> {
  const take = validateQueryLimit(limit, {
    max: MAX_ITEM_QUERY_LIMIT,
    name: "Items by type limit",
  });
  const itemType = await getItemTypeBySlug(slug);

  if (!itemType) {
    return { itemType: null, items: [], nextCursor: null };
  }

  const items = await prisma.item.findMany({
    where: { userId, typeId: itemType.id },
    take: take + 1,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: itemInclude,
  });
  const pageItems = items.slice(0, take);

  return {
    itemType,
    items: pageItems.map(toDashboardItem),
    nextCursor: items.length > take ? (pageItems.at(-1)?.id ?? null) : null,
  };
}

export async function getItemsByCollectionId(
  userId: string,
  collectionId: string,
  limit: number = MAX_ITEM_QUERY_LIMIT
): Promise<DashboardItem[]> {
  const page = await getItemsByCollectionIdPage(userId, collectionId, {
    limit,
  });
  return page.items;
}

export async function getItemsByCollectionIdPage(
  userId: string,
  collectionId: string,
  {
    cursor,
    limit = MAX_ITEM_QUERY_LIMIT,
  }: {
    cursor?: string;
    limit?: number;
  } = {}
): Promise<DashboardItemsPage> {
  const take = validateQueryLimit(limit, {
    max: MAX_ITEM_QUERY_LIMIT,
    name: "Items by collection limit",
  });

  const items = await prisma.item.findMany({
    where: {
      userId,
      OR: [
        { collectionId },
        {
          collections: {
            some: { collectionId },
          },
        },
      ],
    },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: itemInclude,
  });
  const pageItems = items.slice(0, take);

  return {
    items: pageItems.map(toDashboardItem),
    nextCursor: items.length > take ? (pageItems.at(-1)?.id ?? null) : null,
  };
}

export async function getItemsByTypeSlugPage(
  userId: string,
  slug: string,
  {
    cursor,
    limit = MAX_ITEM_QUERY_LIMIT,
  }: {
    cursor?: string;
    limit?: number;
  } = {}
): Promise<DashboardItemsPage> {
  const take = validateQueryLimit(limit, {
    max: MAX_ITEM_QUERY_LIMIT,
    name: "Items by type limit",
  });
  const itemType = await getItemTypeBySlug(slug);

  if (!itemType) {
    return { items: [], nextCursor: null };
  }

  const items = await prisma.item.findMany({
    where: { userId, typeId: itemType.id },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    include: itemInclude,
  });
  const pageItems = items.slice(0, take);

  return {
    items: pageItems.map(toDashboardItem),
    nextCursor: items.length > take ? (pageItems.at(-1)?.id ?? null) : null,
  };
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

export async function createItem(
  userId: string,
  data: CreateItemData
): Promise<DashboardItemDetail | CreateItemFailure> {
  return runSerializableTransaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
      },
    });
    const entitlements = getUsageLimits(user);

    if (
      doesTypeSupportFile(data.typeSlug) &&
      !entitlements.canUploadFiles
    ) {
      return {
        success: false,
        code:
          user?.subscriptionStatus === "PAST_DUE"
            ? "BILLING_PAST_DUE"
            : "PRO_REQUIRED",
      };
    }

    if (entitlements.itemLimit !== null) {
      const itemCount = await tx.item.count({ where: { userId } });

      if (itemCount >= entitlements.itemLimit) {
        return { success: false, code: "ITEM_LIMIT_REACHED" };
      }
    }

    const itemType = await tx.itemType.findFirst({
      where: { slug: data.typeSlug, isSystem: true },
      select: { id: true, slug: true },
    });

    if (!itemType) {
      return { success: false, code: "INVALID_ITEM_TYPE" };
    }

    const tags = normalizeTags(data.tags);
    const supportedData = getSupportedUpdateData(itemType.slug, data);
    const collectionIds = await resolveOwnedCollectionIds(
      tx,
      userId,
      data.collectionIds ?? []
    );

    if (!collectionIds) {
      return { success: false, code: "INVALID_COLLECTION" };
    }

    const supportedFile = await consumeSupportedFileUpload(
      tx,
      userId,
      itemType.slug,
      data.file
    );

    if (doesTypeSupportFile(itemType.slug) && !supportedFile) {
      return { success: false, code: "INVALID_UPLOAD" };
    }

    const createdItem = await tx.item.create({
      data: {
        title: supportedData.title,
        description: supportedData.description,
        contentType: getContentTypeForItemType(itemType.slug),
        content: supportedData.content,
        language: supportedData.language,
        url: supportedData.url,
        fileUrl: supportedFile?.fileUrl ?? null,
        fileName: supportedFile?.fileName ?? null,
        fileMimeType: supportedFile?.fileMimeType ?? null,
        fileSize: supportedFile?.fileSize ?? null,
        userId,
        typeId: itemType.id,
        collectionId: collectionIds[0] ?? null,
        collections: {
          create: collectionIds.map((collectionId) => ({
            collection: {
              connect: { id: collectionId },
            },
          })),
        },
        tags: {
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

    return toDashboardItemDetail(createdItem);
  });
}

export async function createPendingItemUpload(
  userId: string,
  itemTypeSlug: UploadItemType,
  file: StoredFileMetadata
): Promise<UploadedFileMetadata> {
  const upload = await prisma.itemUpload.create({
    data: {
      userId,
      itemTypeSlug,
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      fileMimeType: file.fileMimeType,
      fileSize: file.fileSize,
    },
  });

  return toUploadedFileMetadata(upload);
}

export async function getPendingItemUpload(
  userId: string,
  uploadToken: string
): Promise<StoredFileMetadata | null> {
  const upload = await prisma.itemUpload.findFirst({
    where: {
      id: uploadToken,
      userId,
      consumedAt: null,
    },
  });

  return upload ? toStoredFileMetadata(upload) : null;
}

export async function deletePendingItemUpload(
  userId: string,
  uploadToken: string
): Promise<StoredFileMetadata | null> {
  const upload = await prisma.itemUpload.findFirst({
    where: {
      id: uploadToken,
      userId,
      consumedAt: null,
    },
  });

  if (!upload) {
    return null;
  }

  await prisma.itemUpload.delete({
    where: { id: upload.id },
  });

  return toStoredFileMetadata(upload);
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
    const collectionIds = await resolveOwnedCollectionIds(
      tx,
      userId,
      data.collectionIds ?? []
    );

    if (!collectionIds) {
      return null;
    }

    const updatedItem = await tx.item.update({
      where: { id: itemId, userId },
      data: {
        title: supportedData.title,
        description: supportedData.description,
        content: supportedData.content,
        language: supportedData.language,
        url: supportedData.url,
        collectionId: collectionIds[0] ?? null,
        collections: {
          deleteMany: {},
          create: collectionIds.map((collectionId) => ({
            collection: {
              connect: { id: collectionId },
            },
          })),
        },
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

async function resolveOwnedCollectionIds(
  tx: Prisma.TransactionClient,
  userId: string,
  collectionIds: string[]
): Promise<string[] | null> {
  const uniqueCollectionIds = Array.from(new Set(collectionIds));

  if (uniqueCollectionIds.length === 0) {
    return [];
  }

  const collections = await tx.collection.findMany({
    where: {
      id: { in: uniqueCollectionIds },
      userId,
    },
    select: { id: true },
  });
  const ownedCollectionIds = new Set(
    collections.map((collection) => collection.id)
  );

  if (ownedCollectionIds.size !== uniqueCollectionIds.length) {
    return null;
  }

  return uniqueCollectionIds.filter((collectionId) =>
    ownedCollectionIds.has(collectionId)
  );
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

function getContentTypeForItemType(slug: string) {
  if (doesTypeSupportUrl(slug)) {
    return ItemContentType.URL;
  }

  if (doesTypeSupportFile(slug)) {
    return ItemContentType.FILE;
  }

  return ItemContentType.TEXT;
}

async function consumeSupportedFileUpload(
  tx: Prisma.TransactionClient,
  userId: string,
  itemTypeSlug: string,
  file?: { uploadToken: string } | null
): Promise<StoredFileMetadata | null> {
  if (!doesTypeSupportFile(itemTypeSlug)) {
    return null;
  }

  if (!file?.uploadToken) {
    return null;
  }

  const upload = await tx.itemUpload.findFirst({
    where: {
      id: file.uploadToken,
      userId,
      itemTypeSlug,
      consumedAt: null,
    },
  });

  if (!upload) {
    return null;
  }

  const consumed = await tx.itemUpload.updateMany({
    where: {
      id: upload.id,
      userId,
      itemTypeSlug,
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  if (consumed.count === 0) {
    return null;
  }

  return toStoredFileMetadata(upload);
}

function toUploadedFileMetadata(upload: DbItemUpload): UploadedFileMetadata {
  return {
    uploadToken: upload.id,
    fileName: upload.fileName,
    fileMimeType: upload.fileMimeType,
    fileSize: upload.fileSize,
  };
}

function toStoredFileMetadata(upload: DbItemUpload): StoredFileMetadata {
  return {
    fileUrl: upload.fileUrl,
    fileName: upload.fileName,
    fileMimeType: upload.fileMimeType,
    fileSize: upload.fileSize,
  };
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

  throw new Error("Serializable item transaction retry limit exceeded.");
}

function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
