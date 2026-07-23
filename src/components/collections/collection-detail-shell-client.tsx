"use client";

import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CollectionActionButtons } from "@/components/collections/collection-actions";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  DesktopSidebar,
  MobileDrawer,
} from "@/components/dashboard/dashboard-sidebar";
import { ItemCard } from "@/components/dashboard/item-card";
import { ItemContentDrawer } from "@/components/dashboard/item-content-drawer";
import { ImageThumbnailCard } from "@/components/items/image-thumbnail-card";
import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemStats,
  DashboardItemType,
  DashboardUser,
  GlobalSearchCollection,
  GlobalSearchItem,
  SidebarData,
} from "@/features/dashboard/dashboard-types";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";

type CollectionDetailShellClientProps = {
  readonly user: DashboardUser;
  readonly collection: DashboardCollection;
  readonly collections: DashboardCollection[];
  readonly favoriteCollections: DashboardCollection[];
  readonly itemStats: DashboardItemStats;
  readonly itemTypeCounts: Record<string, number>;
  readonly itemTypes: DashboardItemType[];
  readonly items: DashboardItem[];
  readonly isPro: boolean;
  readonly recentCollections: DashboardCollection[];
  readonly searchCollections: GlobalSearchCollection[];
  readonly searchItems: GlobalSearchItem[];
};

export function CollectionDetailShellClient({
  user,
  collection,
  collections,
  favoriteCollections,
  itemStats,
  itemTypeCounts,
  itemTypes,
  items,
  isPro,
  recentCollections,
  searchCollections,
  searchItems,
}: CollectionDetailShellClientProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);

  const { collectionById, sidebarData, typeById } = useMemo(() => {
    const typeById = new Map(itemTypes.map((type) => [type.id, type]));
    const collectionById = new Map<string, DashboardCollection>(
      [...collections, ...recentCollections, ...favoriteCollections].map(
        (currentCollection) => [currentCollection.id, currentCollection]
      )
    );

    for (const item of items) {
      for (const itemCollection of item.collections) {
        if (!collectionById.has(itemCollection.id)) {
          collectionById.set(itemCollection.id, itemCollection);
        }
      }

      if (item.collection && !collectionById.has(item.collection.id)) {
        collectionById.set(item.collection.id, item.collection);
      }
    }

    const sidebarData: SidebarData = {
      totalItemsCount: itemStats.total,
      favoriteItemsCount: itemStats.favorites,
      pinnedItemsCount: itemStats.pinned,
      recentItemsCount: itemStats.recent,
      types: itemTypes.map((type) => ({
        ...type,
        count: itemTypeCounts[type.id] ?? 0,
        href: getTypeHref(type.slug),
      })),
      favoriteCollections,
      recentCollections: recentCollections.slice(0, 3),
    };

    return { collectionById, sidebarData, typeById };
  }, [
    collections,
    favoriteCollections,
    itemStats,
    itemTypeCounts,
    itemTypes,
    items,
    recentCollections,
  ]);

  const selectedItem = selectedItemId
    ? items.find((item) => item.id === selectedItemId)
    : undefined;
  const selectedType = selectedItem
    ? typeById.get(selectedItem.typeId)
    : undefined;
  const displayCollection = collectionById.get(collection.id) ?? collection;
  const openItemDrawer = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsItemDrawerOpen(true);
  };
  const closeItemDrawer = () => setIsItemDrawerOpen(false);

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <DesktopSidebar
        data={sidebarData}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
        user={user}
      />

      <MobileDrawer
        data={sidebarData}
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        user={user}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          collections={collections}
          isMobileDrawerOpen={isMobileDrawerOpen}
          isPro={isPro}
          itemTypes={itemTypes}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
          searchCollections={searchCollections}
          searchItems={searchItems}
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Collection</p>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {collection.name}
                  </h1>
                  {collection.description && (
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      {collection.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <CollectionActionButtons
                collection={collection}
                onDeleted={() => {
                  router.push("/collections");
                  router.refresh();
                }}
              />
            </div>

            {items.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const itemType = typeById.get(item.typeId);

                  return itemType?.slug === "image" ? (
                    <ImageThumbnailCard
                      collection={displayCollection}
                      item={item}
                      key={item.id}
                      onOpen={() => openItemDrawer(item.id)}
                    />
                  ) : (
                    <ItemCard
                      collection={displayCollection}
                      item={item}
                      key={item.id}
                      onOpen={() => openItemDrawer(item.id)}
                      type={itemType}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-card-foreground">
                <div className="max-w-sm space-y-3">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Inbox className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">
                      No items in this collection
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Items will appear here after they are added to this
                      collection.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ItemContentDrawer
        collections={collections}
        isOpen={isItemDrawerOpen}
        isPro={isPro}
        item={selectedItem}
        itemId={selectedItemId}
        onClose={closeItemDrawer}
        onClosed={() => setSelectedItemId(null)}
        type={selectedType}
      />
    </main>
  );
}
