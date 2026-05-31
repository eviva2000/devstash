"use client";

import { useMemo, useState } from "react";

import type {
<<<<<<< HEAD
  DashboardCollection,
=======
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
  DashboardData,
  DashboardItem,
  DashboardItemStats,
  SidebarData,
<<<<<<< HEAD
=======
  DashboardCollection,
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
} from "@/features/dashboard/dashboard-types";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";

import { DashboardHeader } from "./components/dashboard-header";
import { DashboardMain } from "./components/dashboard-main";
import {
  DesktopSidebar,
  MobileDrawer,
} from "./components/dashboard-sidebar";

interface DashboardShellClientProps {
  recentCollections: DashboardCollection[];
  favoriteCollections: DashboardCollection[];
  itemTypes: Array<{
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
    isSystem?: boolean;
  }>;
  pinnedItems: DashboardItem[];
  recentItems: DashboardItem[];
  itemStats: DashboardItemStats;
  itemTypeCounts: Record<string, number>;
  collectionStats: { total: number; favorites: number };
  itemStats: DashboardItemStats;
  itemTypeCounts: Record<string, number>;
}

export function DashboardShellClient({
  recentCollections,
  favoriteCollections,
  itemTypes,
  pinnedItems,
  recentItems,
  itemStats,
  itemTypeCounts,
  collectionStats,
  itemStats,
  itemTypeCounts,
}: DashboardShellClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { dashboardData, sidebarData } = useMemo(() => {
    const typeById = new Map(itemTypes.map((type) => [type.id, type]));
    const allDashboardItems = uniqueItems([...pinnedItems, ...recentItems]);

<<<<<<< HEAD
=======
    // Transform received collections to match DashboardCollection type
    const transformedCollections: DashboardCollection[] = recentCollections.map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      description: col.description ?? "",
      isFavorite: col.isFavorite,
      itemCount: col.itemCount,
    }));

>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
    const collectionById: Map<string, DashboardCollection> = new Map(
      [...recentCollections, ...favoriteCollections].map((collection) => [
        collection.id,
        collection,
      ])
    );

<<<<<<< HEAD
    const favoriteItems = mockItems.filter((item) => item.isFavorite);
    const pinnedItems = mockItems.filter((item) => item.isPinned);
    const recentItems = [...mockItems]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);
=======
    for (const item of allDashboardItems) {
      if (item.collection && !collectionById.has(item.collection.id)) {
        collectionById.set(item.collection.id, item.collection);
      }
    }

    const favoriteItems = allDashboardItems.filter((item) => item.isFavorite);
    const favoriteCollections = transformedCollections.filter(
      (collection) => collection.isFavorite
    );
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a

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
<<<<<<< HEAD
      recentItemsCount: itemStats.recent,
=======
      recentItemsCount: recentItems.length,
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
      types: itemTypes.map((type) => ({
        ...type,
        count: itemTypeCounts[type.id] ?? 0,
        href: getTypeHref(type.slug),
      })),
      favoriteCollections,
      recentCollections: recentCollections.slice(0, 3),
    };

    return { dashboardData, sidebarData };
<<<<<<< HEAD
  }, [
    favoriteCollections,
    itemStats,
    itemTypeCounts,
    itemTypes,
    mockItems,
    recentCollections,
  ]);
=======
  }, [recentCollections, itemTypes, pinnedItems, recentItems, itemStats, itemTypeCounts]);
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a

  return (
    <main className="flex min-h-screen overflow-hidden bg-background text-foreground">
      <DesktopSidebar
        data={sidebarData}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((value) => !value)}
      />

      <MobileDrawer
        data={sidebarData}
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          isMobileDrawerOpen={isMobileDrawerOpen}
          onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        />
        <DashboardMain
          data={dashboardData}
          extendedCollections={recentCollections}
          collectionStats={collectionStats}
          itemStats={itemStats}
        />
      </section>
    </main>
  );
}

function uniqueItems(items: DashboardItem[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
