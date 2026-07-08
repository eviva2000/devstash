"use client";

import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ItemCreateDialog } from "@/components/dashboard/item-create-dialog";
import {
  DesktopSidebar,
  MobileDrawer,
} from "@/components/dashboard/dashboard-sidebar";
import { ItemCard } from "@/components/dashboard/item-card";
import { ItemContentDrawer } from "@/components/dashboard/item-content-drawer";
import { FileListRow } from "@/components/items/file-list-row";
import { ImageThumbnailCard } from "@/components/items/image-thumbnail-card";
import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemStats,
  DashboardItemType,
  DashboardUser,
  SidebarData,
} from "@/features/dashboard/dashboard-types";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";
import { isCreatableItemType } from "@/lib/item-type-capabilities";

interface ItemListShellClientProps {
  readonly user: DashboardUser;
  readonly recentCollections: DashboardCollection[];
  readonly favoriteCollections: DashboardCollection[];
  readonly itemTypes: DashboardItemType[];
  readonly itemType: DashboardItemType;
  readonly items: DashboardItem[];
  readonly itemStats: DashboardItemStats;
  readonly itemTypeCounts: Record<string, number>;
}

export function ItemListShellClient({
  user,
  recentCollections,
  favoriteCollections,
  itemTypes,
  itemType,
  items,
  itemStats,
  itemTypeCounts,
}: ItemListShellClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);

  const sidebarData: SidebarData = useMemo(
    () => ({
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
    }),
    [
      favoriteCollections,
      itemStats,
      itemTypeCounts,
      itemTypes,
      recentCollections,
    ]
  );
  const collectionById = useMemo(() => {
    const collections = new Map<string, DashboardCollection>(
      [...recentCollections, ...favoriteCollections].map((collection) => [
        collection.id,
        collection,
      ])
    );

    for (const item of items) {
      if (item.collection && !collections.has(item.collection.id)) {
        collections.set(item.collection.id, item.collection);
      }
    }

    return collections;
  }, [favoriteCollections, items, recentCollections]);
  const selectedItem = selectedItemId
    ? items.find((item) => item.id === selectedItemId)
    : undefined;
  const openItemDrawer = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsItemDrawerOpen(true);
  };
  const closeItemDrawer = () => setIsItemDrawerOpen(false);
  const canCreateActiveType = isCreatableItemType(itemType.slug);
  const createButtonLabel = `New ${toTitleCase(itemType.name)}`;
  const isFileList = itemType.slug === "file";
  const isImageGallery = itemType.slug === "image";
  const getItemCollection = (item: DashboardItem) =>
    item.collectionId ? collectionById.get(item.collectionId) : undefined;

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
          initialCreateTypeSlug={itemType.slug}
          isMobileDrawerOpen={isMobileDrawerOpen}
          itemTypes={itemTypes}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Items</p>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {itemType.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                {canCreateActiveType && (
                  <ItemCreateDialog
                    initialTypeSlug={itemType.slug}
                    itemTypes={itemTypes}
                    triggerLabel={createButtonLabel}
                  />
                )}
              </div>
            </div>

            {items.length > 0 ? (
              isFileList ? (
                <div className="overflow-hidden rounded-md border border-border bg-card">
                  <div className="hidden grid-cols-[minmax(0,1fr)_140px_132px_104px] border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
                    <span>Name</span>
                    <span>Size</span>
                    <span>Uploaded</span>
                    <span className="text-right">Action</span>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <FileListRow
                        item={item}
                        key={item.id}
                        onOpen={() => openItemDrawer(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className={
                    isImageGallery
                      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  }
                >
                  {items.map((item) =>
                    isImageGallery ? (
                      <ImageThumbnailCard
                        collection={getItemCollection(item)}
                        item={item}
                        key={item.id}
                        onOpen={() => openItemDrawer(item.id)}
                      />
                    ) : (
                      <ItemCard
                        collection={getItemCollection(item)}
                        item={item}
                        key={item.id}
                        onOpen={() => openItemDrawer(item.id)}
                        type={itemType}
                      />
                    )
                  )}
                </div>
              )
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-card-foreground">
                <div className="max-w-sm space-y-3">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Inbox className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">
                      No {itemType.name} items
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Items of this type will appear here after they are added.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ItemContentDrawer
        isOpen={isItemDrawerOpen}
        item={selectedItem}
        itemId={selectedItemId}
        onClose={closeItemDrawer}
        onClosed={() => setSelectedItemId(null)}
        type={itemType}
      />
    </main>
  );
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
