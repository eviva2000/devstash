import {
  mockCollections,
  mockItems,
  mockItemTypes,
} from "@/lib/mock-data";

import type { DashboardData, SidebarData } from "./dashboard-types";
import { getTypeHref } from "./dashboard-utils";

export function getDashboardData(): {
  dashboardData: DashboardData;
  sidebarData: SidebarData;
} {
  const typeCounts = new Map<string, number>();
  const typeById = new Map(mockItemTypes.map((type) => [type.id, type]));
  const collectionById = new Map(
    mockCollections.map((collection) => [collection.id, collection])
  );

  for (const item of mockItems) {
    typeCounts.set(item.typeId, (typeCounts.get(item.typeId) ?? 0) + 1);
  }

  const favoriteItems = mockItems.filter((item) => item.isFavorite);
  const favoriteCollections = mockCollections.filter(
    (collection) => collection.isFavorite
  );
  const pinnedItems = mockItems.filter((item) => item.isPinned);
  const recentItems = [...mockItems]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);
  const recentCollections = mockCollections.slice(0, 5);

  return {
    dashboardData: {
      collectionById,
      favoriteCollections,
      favoriteItems,
      pinnedItems,
      recentCollections,
      recentItems,
      typeById,
    },
    sidebarData: {
      totalItemsCount: mockItems.length,
      favoriteItemsCount: favoriteItems.length,
      pinnedItemsCount: pinnedItems.length,
      recentItemsCount: Math.min(mockItems.length, 5),
      types: mockItemTypes.map((type) => ({
        ...type,
        count: typeCounts.get(type.id) ?? 0,
        href: getTypeHref(type.slug),
      })),
      favoriteCollections,
      recentCollections: mockCollections.slice(0, 3),
    },
  };
}
