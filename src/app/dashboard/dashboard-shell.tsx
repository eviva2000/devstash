import { DashboardShellClient } from "./dashboard-shell-client";
import type {
<<<<<<< HEAD
  DashboardCollection,
  DashboardItemStats,
  DashboardItemType,
=======
  DashboardItem,
  DashboardItemStats,
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
} from "@/features/dashboard/dashboard-types";
import {
  getFavoriteCollections,
  getCollectionStats,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import { getItemStats, getItemTypeCounts } from "@/lib/db/items";
import {
  getItemStats,
  getItemTypeCounts,
  getPinnedItems,
  getRecentItems,
} from "@/lib/db/items";
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
<<<<<<< HEAD
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
=======
  type RecentCollection = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    isFavorite: boolean;
    itemCount: number;
    dominantType?: { icon?: string | null; color?: string | null } | null;
    types?: Array<{ icon?: string | null; name: string; slug?: string }>;
  };

  type ItemType = {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
  };

  let recentCollections: RecentCollection[] = [];
  let itemTypes: ItemType[] = [];
  let pinnedItems: DashboardItem[] = [];
  let recentItems: DashboardItem[] = [];
  let itemTypeCounts: Record<string, number> = {};
  let collectionStats = { total: 0, favorites: 0 };
  let itemStats: DashboardItemStats = { total: 0, favorites: 0, pinned: 0 };
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a

  try {
    const userId = await resolveDemoUserId();
    if (!userId) {
      throw new Error("No user found in database.");
    }

    const [
<<<<<<< HEAD
      dbRecentCollections,
      dbFavoriteCollections,
      dbTypes,
      dbCollectionStats,
=======
      dbCollections,
      dbTypes,
      dbCollectionStats,
      dbPinnedItems,
      dbRecentItems,
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
      dbItemStats,
      dbItemTypeCounts,
    ] = await Promise.all([
      getRecentCollections(userId, 6),
      getFavoriteCollections(userId),
      getItemTypes(),
      getCollectionStats(userId),
<<<<<<< HEAD
=======
      getPinnedItems(userId),
      getRecentItems(userId, 10),
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
      getItemStats(userId),
      getItemTypeCounts(userId),
    ]);

<<<<<<< HEAD
    recentCollections = dbRecentCollections;
    favoriteCollections = dbFavoriteCollections;
    itemTypes = dbTypes;
    collectionStats = dbCollectionStats;
    itemStats = dbItemStats;
    itemTypeCounts = dbItemTypeCounts;
  } catch (error) {
    console.warn("Failed to fetch dashboard sidebar data from database, using mock data:", error);
=======
    recentCollections = dbCollections as RecentCollection[];
    itemTypes = dbTypes as ItemType[];
    collectionStats = dbCollectionStats;
    pinnedItems = dbPinnedItems;
    recentItems = dbRecentItems;
    itemStats = dbItemStats;
    itemTypeCounts = dbItemTypeCounts;
  } catch (error) {
    console.warn("Failed to fetch dashboard data from database:", error);
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
  }

  return (
    <DashboardShellClient
      recentCollections={recentCollections}
      favoriteCollections={favoriteCollections}
      itemTypes={itemTypes}
      pinnedItems={pinnedItems}
      recentItems={recentItems}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
      collectionStats={collectionStats}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
    />
  );
}
