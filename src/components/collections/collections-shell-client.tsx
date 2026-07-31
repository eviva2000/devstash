"use client";

import { FolderOpen } from "lucide-react";
import { useMemo } from "react";

import { CollectionCard } from "@/components/dashboard/collection-card";
import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import type {
  DashboardCollection,
  DashboardItemStats,
  DashboardItemType,
  DashboardPlanUsage,
  DashboardUser,
  GlobalSearchCollection,
  GlobalSearchItem,
  SidebarData,
} from "@/features/dashboard/dashboard-types";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";

type CollectionsShellClientProps = {
  readonly user: DashboardUser;
  readonly collections: DashboardCollection[];
  readonly favoriteCollections: DashboardCollection[];
  readonly itemStats: DashboardItemStats;
  readonly itemTypeCounts: Record<string, number>;
  readonly itemTypes: DashboardItemType[];
  readonly isPro: boolean;
  readonly recentCollections: DashboardCollection[];
  readonly searchCollections: GlobalSearchCollection[];
  readonly searchItems: GlobalSearchItem[];
  readonly usage: DashboardPlanUsage;
};

export function CollectionsShellClient({
  user,
  collections,
  favoriteCollections,
  itemStats,
  itemTypeCounts,
  itemTypes,
  isPro,
  recentCollections,
  searchCollections,
  searchItems,
  usage,
}: CollectionsShellClientProps) {
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

  return (
    <DashboardAppShell
      renderHeader={({ isMobileDrawerOpen, openMobileDrawer }) => (
        <DashboardHeader
          collections={collections}
          isMobileDrawerOpen={isMobileDrawerOpen}
          isPro={isPro}
          itemTypes={itemTypes}
          onOpenMobileDrawer={openMobileDrawer}
          searchCollections={searchCollections}
          searchItems={searchItems}
          usage={usage}
        />
      )}
      sidebarData={sidebarData}
      user={user}
    >

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Collections
              </h1>
              <p className="text-sm text-muted-foreground">
                {collections.length}{" "}
                {collections.length === 1 ? "collection" : "collections"}
              </p>
            </div>

            {collections.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {collections.map((collection) => (
                  <CollectionCard collection={collection} key={collection.id} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-border bg-card px-6 py-10 text-center text-card-foreground">
                <div className="max-w-sm space-y-3">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FolderOpen className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold">
                      No collections yet
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Collections will appear here after they are created.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </DashboardAppShell>
  );
}
