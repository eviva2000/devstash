"use client";

import { useMemo, useState } from "react";

import type {
  DashboardData,
  DashboardItem,
  DashboardItemStats,
  SidebarData,
  DashboardCollection,
} from "@/features/dashboard/dashboard-types";
import { getTypeHref } from "@/features/dashboard/dashboard-utils";

import { DashboardHeader } from "./components/dashboard-header";
import { DashboardMain } from "./components/dashboard-main";
import {
  DesktopSidebar,
  MobileDrawer,
} from "./components/dashboard-sidebar";

interface DashboardShellClientProps {
  recentCollections: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    isFavorite: boolean;
    itemCount: number;
    dominantType?: { icon?: string | null; color?: string | null } | null;
    types?: Array<{ icon?: string | null; name: string; slug?: string }>;
  }>;
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
}

export function DashboardShellClient({
  recentCollections,
  itemTypes,
  pinnedItems,
  recentItems,
  itemStats,
  itemTypeCounts,
  collectionStats,
}: DashboardShellClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { dashboardData, sidebarData } = useMemo(() => {
    const typeById = new Map(itemTypes.map((type) => [type.id, type]));
    const allDashboardItems = uniqueItems([...pinnedItems, ...recentItems]);

    // Transform received collections to match DashboardCollection type
    const transformedCollections: DashboardCollection[] = recentCollections.map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      description: col.description ?? "",
      isFavorite: col.isFavorite,
      itemCount: col.itemCount,
    }));

    const collectionById: Map<string, DashboardCollection> = new Map(
      transformedCollections.map((collection) => [collection.id, collection])
    );

    for (const item of allDashboardItems) {
      if (item.collection && !collectionById.has(item.collection.id)) {
        collectionById.set(item.collection.id, item.collection);
      }
    }

    const favoriteItems = allDashboardItems.filter((item) => item.isFavorite);
    const favoriteCollections = transformedCollections.filter(
      (collection) => collection.isFavorite
    );

    const dashboardData: DashboardData = {
      collectionById,
      favoriteCollections,
      favoriteItems,
      pinnedItems,
      recentCollections: transformedCollections,
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
      recentCollections: transformedCollections.slice(0, 3),
    };

    return { dashboardData, sidebarData };
  }, [recentCollections, itemTypes, pinnedItems, recentItems, itemStats, itemTypeCounts]);

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
