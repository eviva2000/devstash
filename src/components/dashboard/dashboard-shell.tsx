import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserBillingAccess } from "@/lib/billing/entitlements";
import { DashboardShellClient } from "./dashboard-shell-client";
import {
  getCollections,
  getCollectionStats,
  getFavoriteCollections,
  getGlobalSearchCollections,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import {
  getGlobalSearchItems,
  getItemStats,
  getItemTypeCounts,
  getPinnedItems,
  getRecentItems,
} from "@/lib/db/items";

export async function DashboardShell() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "DevStash user";

  const [
    recentCollections,
    collections,
    favoriteCollections,
    itemTypes,
    collectionStats,
    pinnedItems,
    recentItems,
    itemStats,
    itemTypeCounts,
    searchCollections,
    searchItems,
    billingAccess,
  ] = await Promise.all([
    getRecentCollections(userId, 6),
    getCollections(userId),
    getFavoriteCollections(userId),
    getItemTypes(),
    getCollectionStats(userId),
    getPinnedItems(userId),
    getRecentItems(userId, 10),
    getItemStats(userId),
    getItemTypeCounts(userId),
    getGlobalSearchCollections(userId),
    getGlobalSearchItems(userId),
    getUserBillingAccess(userId),
  ]);

  return (
    <DashboardShellClient
      user={{
        name: userName,
        email: session.user.email,
        image: session.user.image,
      }}
      recentCollections={recentCollections}
      collections={collections}
      favoriteCollections={favoriteCollections}
      itemTypes={itemTypes}
      pinnedItems={pinnedItems}
      recentItems={recentItems}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
      searchCollections={searchCollections}
      searchItems={searchItems}
      isPro={billingAccess.hasActivePro}
      collectionStats={collectionStats}
      usage={{
        itemUsed: itemStats.total,
        itemLimit: billingAccess.itemLimit,
        collectionUsed: collectionStats.total,
        collectionLimit: billingAccess.collectionLimit,
        billingStatus: billingAccess.subscriptionStatus,
      }}
    />
  );
}
