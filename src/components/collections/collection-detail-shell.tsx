import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserBillingAccess } from "@/lib/billing/entitlements";
import { CollectionDetailShellClient } from "@/components/collections/collection-detail-shell-client";
import {
  getCollectionById,
  getCollections,
  getFavoriteCollections,
  getGlobalSearchCollections,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import {
  getGlobalSearchItems,
  getItemsByCollectionIdPage,
  getItemStats,
  getItemTypeCounts,
} from "@/lib/db/items";

export async function CollectionDetailShell({
  collectionId,
}: {
  collectionId: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "DevStash user";

  const [
    collection,
    itemPage,
    collections,
    recentCollections,
    favoriteCollections,
    itemTypes,
    itemStats,
    itemTypeCounts,
    searchCollections,
    searchItems,
    billingAccess,
  ] = await Promise.all([
    getCollectionById(userId, collectionId),
    getItemsByCollectionIdPage(userId, collectionId),
    getCollections(userId),
    getRecentCollections(userId, 6),
    getFavoriteCollections(userId),
    getItemTypes(),
    getItemStats(userId),
    getItemTypeCounts(userId),
    getGlobalSearchCollections(userId),
    getGlobalSearchItems(userId),
    getUserBillingAccess(userId),
  ]);

  if (!collection) {
    notFound();
  }

  return (
    <CollectionDetailShellClient
      user={{
        name: userName,
        email: session.user.email,
        image: session.user.image,
      }}
      collection={collection}
      collections={collections}
      favoriteCollections={favoriteCollections}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
      itemTypes={itemTypes}
      items={itemPage.items}
      isPro={billingAccess.hasActivePro}
      recentCollections={recentCollections}
      searchCollections={searchCollections}
      searchItems={searchItems}
      usage={{
        itemUsed: itemStats.total,
        itemLimit: billingAccess.itemLimit,
        collectionUsed: collections.length,
        collectionLimit: billingAccess.collectionLimit,
        billingStatus: billingAccess.subscriptionStatus,
      }}
      nextCursor={itemPage.nextCursor}
    />
  );
}
