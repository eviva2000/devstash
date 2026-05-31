import { DashboardShellClient } from "./dashboard-shell-client";
import type {
  DashboardCollection,
  DashboardItemStats,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import {
  getFavoriteCollections,
  getCollectionStats,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import { getItemStats, getItemTypeCounts } from "@/lib/db/items";
import {
  mockItemTypes,
  mockCollections,
  mockItems,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

// TODO: Replace with the authenticated user once auth is wired up.
// For now, fall back to the first user in the database.
async function resolveDemoUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return user?.id ?? null;
}

export async function DashboardShell() {
  let recentCollections: DashboardCollection[] = mockCollections
    .slice(0, 6)
    .map((collection) => ({
      ...collection,
      description: collection.description ?? "",
    }));
  let favoriteCollections: DashboardCollection[] = mockCollections
    .filter((collection) => collection.isFavorite)
    .map((collection) => ({
      ...collection,
      description: collection.description ?? "",
    }));
  let itemTypes: DashboardItemType[] = mockItemTypes;
  let collectionStats = {
    total: mockCollections.length,
    favorites: mockCollections.filter((c) => c.isFavorite).length,
  };
  let itemStats: DashboardItemStats = {
    total: mockItems.length,
    favorites: mockItems.filter((item) => item.isFavorite).length,
    pinned: mockItems.filter((item) => item.isPinned).length,
    recent: Math.min(mockItems.length, 10),
  };
  let itemTypeCounts: Record<string, number> = mockItems.reduce<
    Record<string, number>
  >((counts, item) => {
    counts[item.typeId] = (counts[item.typeId] ?? 0) + 1;
    return counts;
  }, {});

  try {
    const userId = await resolveDemoUserId();
    if (!userId) {
      throw new Error("No user found in database; using mock data.");
    }

    const [
      dbRecentCollections,
      dbFavoriteCollections,
      dbTypes,
      dbCollectionStats,
      dbItemStats,
      dbItemTypeCounts,
    ] = await Promise.all([
      getRecentCollections(userId, 6),
      getFavoriteCollections(userId),
      getItemTypes(),
      getCollectionStats(userId),
      getItemStats(userId),
      getItemTypeCounts(userId),
    ]);

    recentCollections = dbRecentCollections;
    favoriteCollections = dbFavoriteCollections;
    itemTypes = dbTypes;
    collectionStats = dbCollectionStats;
    itemStats = dbItemStats;
    itemTypeCounts = dbItemTypeCounts;
  } catch (error) {
    console.warn("Failed to fetch dashboard sidebar data from database, using mock data:", error);
  }

  return (
    <DashboardShellClient
      recentCollections={recentCollections}
      favoriteCollections={favoriteCollections}
      itemTypes={itemTypes}
      mockItems={mockItems}
      collectionStats={collectionStats}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
    />
  );
}
