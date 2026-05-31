"use client";

import { useMemo, useState } from "react";

import type {
  DashboardCollection,
  DashboardData,
  DashboardItem,
  DashboardItemStats,
  SidebarData,
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
  mockItems: DashboardItem[];
  collectionStats: { total: number; favorites: number };
  itemStats: DashboardItemStats;
  itemTypeCounts: Record<string, number>;
}

export function DashboardShellClient({
  recentCollections,
  favoriteCollections,
  itemTypes,
  mockItems,
  collectionStats,
  itemStats,
  itemTypeCounts,
}: DashboardShellClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const { dashboardData, sidebarData } = useMemo(() => {
    const typeById = new Map(itemTypes.map((type) => [type.id, type]));

    const collectionById: Map<string, DashboardCollection> = new Map(
      [...recentCollections, ...favoriteCollections].map((collection) => [
        collection.id,
        collection,
      ])
    );

    const favoriteItems = mockItems.filter((item) => item.isFavorite);
    const pinnedItems = mockItems.filter((item) => item.isPinned);
    const recentItems = [...mockItems]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);

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
      recentItemsCount: itemStats.recent,
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
    favoriteCollections,
    itemStats,
    itemTypeCounts,
    itemTypes,
    mockItems,
    recentCollections,
  ]);

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
