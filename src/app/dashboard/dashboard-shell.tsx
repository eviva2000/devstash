import { DashboardShellClient } from "./dashboard-shell-client";
import type {
  DashboardItem,
  DashboardItemStats,
} from "@/features/dashboard/dashboard-types";
import {
  getCollectionStats,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
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

  try {
    const userId = await resolveDemoUserId();
    if (!userId) {
      throw new Error("No user found in database.");
    }

    const [
      dbCollections,
      dbTypes,
      dbCollectionStats,
      dbPinnedItems,
      dbRecentItems,
      dbItemStats,
      dbItemTypeCounts,
    ] = await Promise.all([
      getRecentCollections(userId, 6),
      getItemTypes(userId),
      getCollectionStats(userId),
      getPinnedItems(userId),
      getRecentItems(userId, 10),
      getItemStats(userId),
      getItemTypeCounts(userId),
    ]);

    recentCollections = dbCollections as RecentCollection[];
    itemTypes = dbTypes as ItemType[];
    collectionStats = dbCollectionStats;
    pinnedItems = dbPinnedItems;
    recentItems = dbRecentItems;
    itemStats = dbItemStats;
    itemTypeCounts = dbItemTypeCounts;
  } catch (error) {
    console.warn("Failed to fetch dashboard data from database:", error);
  }

  return (
    <DashboardShellClient
      recentCollections={recentCollections}
      itemTypes={itemTypes}
      pinnedItems={pinnedItems}
      recentItems={recentItems}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
      collectionStats={collectionStats}
    />
  );
}
