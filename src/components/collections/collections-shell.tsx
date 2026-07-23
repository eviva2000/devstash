import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isProUser } from "@/lib/ai/access";
import { CollectionsShellClient } from "@/components/collections/collections-shell-client";
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
} from "@/lib/db/items";

export async function CollectionsShell() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "DevStash user";

  const [
    collections,
    recentCollections,
    favoriteCollections,
    itemTypes,
    itemStats,
    itemTypeCounts,
    searchCollections,
    searchItems,
    isPro,
  ] = await Promise.all([
    getCollections(userId),
    getRecentCollections(userId, 6),
    getFavoriteCollections(userId),
    getItemTypes(),
    getItemStats(userId),
    getItemTypeCounts(userId),
    getGlobalSearchCollections(userId),
    getGlobalSearchItems(userId),
    isProUser(userId),
  ]);

  return (
    <CollectionsShellClient
      user={{
        name: userName,
        email: session.user.email,
        image: session.user.image,
      }}
      collections={collections}
      favoriteCollections={favoriteCollections}
      itemStats={itemStats}
      itemTypeCounts={itemTypeCounts}
      itemTypes={itemTypes}
      isPro={isPro}
      recentCollections={recentCollections}
      searchCollections={searchCollections}
      searchItems={searchItems}
    />
  );
}
