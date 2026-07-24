"use client";

import { useMemo, useState } from "react";

import type {
  DashboardData,
  DashboardItem,
  DashboardItemStats,
  SidebarData,
  DashboardCollection,
  DashboardUser,
  DashboardPlanUsage,
  GlobalSearchCollection,
  GlobalSearchItem,
} from "@/features/dashboard/dashboard-types";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";

import { DashboardHeader } from "./dashboard-header";
import { DashboardMain } from "./dashboard-main";
import {
  DesktopSidebar,
  MobileDrawer,
} from "./dashboard-sidebar";

interface DashboardShellClientProps {
  readonly user: DashboardUser;
  readonly recentCollections: DashboardCollection[];
  readonly collections: DashboardCollection[];
  readonly favoriteCollections: DashboardCollection[];
  readonly itemTypes: Array<{
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly icon?: string | null;
    readonly color?: string | null;
    readonly isSystem?: boolean;
  }>;
  readonly pinnedItems: DashboardItem[];
  readonly recentItems: DashboardItem[];
  readonly itemStats: DashboardItemStats;
  readonly itemTypeCounts: Record<string, number>;
  readonly searchCollections: GlobalSearchCollection[];
  readonly searchItems: GlobalSearchItem[];
  readonly isPro: boolean;
  readonly collectionStats: { readonly total: number; readonly favorites: number };
  readonly usage: DashboardPlanUsage;
}

export function DashboardShellClient({
  user,
  recentCollections,
  collections,
  favoriteCollections,
  itemTypes,
  pinnedItems,
  recentItems,
  itemTypeCounts,
  searchCollections,
  searchItems,
  isPro,
  collectionStats,
  itemStats,
  usage,
}: Readonly<DashboardShellClientProps>) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { dashboardData, sidebarData } = useMemo(() => {
    const typeById = new Map(itemTypes.map((type) => [type.id, type]));
    const allDashboardItems = uniqueItems([...pinnedItems, ...recentItems]);

    const collectionById: Map<string, DashboardCollection> = new Map(
      [...collections, ...recentCollections, ...favoriteCollections].map((collection) => [
        collection.id,
        collection,
      ])
    );

    for (const item of allDashboardItems) {
      for (const collection of item.collections) {
        if (!collectionById.has(collection.id)) {
          collectionById.set(collection.id, collection);
        }
      }

      if (item.collection && !collectionById.has(item.collection.id)) {
        collectionById.set(item.collection.id, item.collection);
      }
    }

    const favoriteItems = allDashboardItems.filter((item) => item.isFavorite);

    const dashboardData: DashboardData = {
      collectionById,
      favoriteCollections,
      favoriteItems,
      pinnedItems,
      recentCollections,
      recentItems,
      typeById,
    };

    const sidebarData: SidebarData = {
      totalItemsCount: itemStats.total,
      favoriteItemsCount: itemStats.favorites,
      pinnedItemsCount: itemStats.pinned,
      recentItemsCount: recentItems.length,
      types: itemTypes.map((type) => ({
        ...type,
        count: itemTypeCounts[type.id] ?? 0,
        href: getTypeHref(type.slug),
      })),
      favoriteCollections,
      recentCollections: recentCollections.slice(0, 3),
    };

    return { dashboardData, sidebarData };
  }, [
    recentCollections,
    collections,
    favoriteCollections,
    itemTypes,
    pinnedItems,
    recentItems,
    itemStats,
    itemTypeCounts,
  ]);

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
          usage={usage}
        />
        <DashboardMain
          collections={collections}
          data={dashboardData}
          extendedCollections={recentCollections}
          collectionStats={collectionStats}
          itemStats={itemStats}
          isPro={isPro}
        />
      </section>
    </main>
  );
}

function uniqueItems(items: DashboardItem[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
