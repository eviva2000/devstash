import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserBillingAccess } from "@/lib/billing/entitlements";
import { ItemListShellClient } from "@/components/items/item-list-shell-client";
import { ItemTypeUpgradePage } from "@/components/items/item-type-upgrade-page";
import {
  getCollections,
  getFavoriteCollections,
  getGlobalSearchCollections,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import {
  getGlobalSearchItems,
  getItemStats,
  getItemTypeBySlug,
  getItemTypeCounts,
  getItemsByTypeSlug,
} from "@/lib/db/items";
import { isProOnlyItemType } from "@/lib/item-type-capabilities";

export async function ItemListShell({ typeSlug }: { typeSlug: string }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "DevStash user";
  const [itemType, billingAccess] = await Promise.all([
    getItemTypeBySlug(typeSlug),
    getUserBillingAccess(userId),
  ]);

  if (!itemType) {
    notFound();
  }

  if (isProOnlyItemType(itemType.slug) && !billingAccess.hasActivePro) {
    return (
      <ItemTypeUpgradePage
        billingStatus={billingAccess.subscriptionStatus}
        itemTypeSlug={itemType.slug}
      />
    );
  }

  const [
    recentCollections,
    collections,
    favoriteCollections,
    itemTypes,
    itemStats,
    itemTypeCounts,
    typedItems,
    searchCollections,
    searchItems,
  ] = await Promise.all([
    getRecentCollections(userId, 6),
    getCollections(userId),
    getFavoriteCollections(userId),
    getItemTypes(),
    getItemStats(userId),
    getItemTypeCounts(userId),
    getItemsByTypeSlug(userId, itemType.slug),
    getGlobalSearchCollections(userId),
    getGlobalSearchItems(userId),
  ]);

  return (
    <ItemListShellClient
      user={{
        name: userName,
        email: session.user.email,
        image: session.user.image,
      }}
      favoriteCollections={favoriteCollections}
      collections={collections}
      itemStats={itemStats}
      itemType={itemType}
      itemTypeCounts={itemTypeCounts}
      itemTypes={itemTypes}
      items={typedItems.items}
      nextCursor={typedItems.nextCursor}
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
    />
  );
}
