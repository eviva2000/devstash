import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { isProUser } from "@/lib/ai/access";
import { ItemListShellClient } from "@/components/items/item-list-shell-client";
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
  getItemTypeCounts,
  getItemsByTypeSlug,
} from "@/lib/db/items";

export async function ItemListShell({ typeSlug }: { typeSlug: string }) {
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
    itemStats,
    itemTypeCounts,
    typedItems,
    searchCollections,
    searchItems,
    isPro,
  ] = await Promise.all([
    getRecentCollections(userId, 6),
    getCollections(userId),
    getFavoriteCollections(userId),
    getItemTypes(),
    getItemStats(userId),
    getItemTypeCounts(userId),
    getItemsByTypeSlug(userId, typeSlug),
    getGlobalSearchCollections(userId),
    getGlobalSearchItems(userId),
    isProUser(userId),
  ]);

  if (!typedItems.itemType) {
    notFound();
  }

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
      itemType={typedItems.itemType}
      itemTypeCounts={itemTypeCounts}
      itemTypes={itemTypes}
      items={typedItems.items}
      isPro={isPro}
      recentCollections={recentCollections}
      searchCollections={searchCollections}
      searchItems={searchItems}
    />
  );
}
