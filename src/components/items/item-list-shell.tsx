import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { ItemListShellClient } from "@/components/items/item-list-shell-client";
import {
  getFavoriteCollections,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import {
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
    favoriteCollections,
    itemTypes,
    itemStats,
    itemTypeCounts,
    typedItems,
  ] = await Promise.all([
    getRecentCollections(userId, 6),
    getFavoriteCollections(userId),
    getItemTypes(),
    getItemStats(userId),
    getItemTypeCounts(userId),
    getItemsByTypeSlug(userId, typeSlug),
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
      itemStats={itemStats}
      itemType={typedItems.itemType}
      itemTypeCounts={itemTypeCounts}
      itemTypes={itemTypes}
      items={typedItems.items}
      recentCollections={recentCollections}
    />
  );
}
