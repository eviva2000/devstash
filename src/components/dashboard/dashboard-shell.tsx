import { DashboardShellClient } from "./dashboard-shell-client";
import {
  getCollectionStats,
  getFavoriteCollections,
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
  const userId = await resolveDemoUserId();
  if (!userId) {
    throw new Error("No user found in database.");
  }

  const [
    recentCollections,
    favoriteCollections,
    itemTypes,
    collectionStats,
    pinnedItems,
    recentItems,
    itemStats,
    itemTypeCounts,
  ] = await Promise.all([
    getRecentCollections(userId, 6),
    getFavoriteCollections(userId),
    getItemTypes(),
    getCollectionStats(userId),
    getPinnedItems(userId),
    getRecentItems(userId, 10),
    getItemStats(userId),
    getItemTypeCounts(userId),
  ]);

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
    />
  );
}
