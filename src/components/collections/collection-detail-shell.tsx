import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { isProUser } from "@/lib/ai/access";
import { CollectionDetailShellClient } from "@/components/collections/collection-detail-shell-client";
import {
  getCollectionById,
  getCollections,
  getFavoriteCollections,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import {
  getItemsByCollectionId,
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
    items,
    collections,
    recentCollections,
    favoriteCollections,
    itemTypes,
    itemStats,
    itemTypeCounts,
    isPro,
  ] = await Promise.all([
    getCollectionById(userId, collectionId),
    getItemsByCollectionId(userId, collectionId),
    getCollections(userId),
    getRecentCollections(userId, 6),
    getFavoriteCollections(userId),
    getItemTypes(),
    getItemStats(userId),
    getItemTypeCounts(userId),
    isProUser(userId),
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
      items={items}
      isPro={isPro}
      recentCollections={recentCollections}
    />
  );
}
