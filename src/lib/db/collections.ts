import { prisma } from "@/lib/prisma";

/**
 * Get recent collections with item counts and type distribution
 * Calculates the dominant item type for each collection
 */
export async function getRecentCollections(userId: string, limit: number = 6) {
  const collections = await prisma.collection.findMany({
    where: { userId },
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        include: {
          type: {
            select: { id: true, name: true, slug: true, icon: true, color: true },
          },
        },
      },
    },
  });

  // Transform collections with type distribution and dominant type
  return collections.map((collection) => {
    const typeCountMap = new Map<string, { count: number; type: (typeof collection.items)[0]["type"] }>();

    // Count items by type
    collection.items.forEach((item) => {
      const existing = typeCountMap.get(item.typeId);
      if (existing) {
        existing.count++;
      } else {
        typeCountMap.set(item.typeId, { count: 1, type: item.type });
      }
    });

    // Get dominant type (most items in this collection)
    let dominantType = Array.from(typeCountMap.values())[0]?.type || null;
    if (typeCountMap.size > 0) {
      dominantType = Array.from(typeCountMap.values()).reduce((prev, current) =>
        current.count > prev.count ? current : prev
      ).type;
    }

    // Get all types in this collection for display
    const types = Array.from(typeCountMap.values()).map((entry) => ({
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
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      dominantType,
      types,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  });
}

/**
 * Get all item types with colors and icons
 * Used for displaying type information in the dashboard
 */
export async function getItemTypes(userId: string) {
  return await prisma.itemType.findMany({
    where: {
      OR: [{ userId }, { isSystem: true }],
    },
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
