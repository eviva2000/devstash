import {
  mockCollections,
  mockItems,
  mockItemTypes,
} from "@/lib/mock-data";

export type DashboardCollection = (typeof mockCollections)[number];
export type DashboardItem = (typeof mockItems)[number];
export type DashboardItemType = (typeof mockItemTypes)[number];

export type DashboardData = {
  collectionById: Map<string, DashboardCollection>;
  favoriteCollections: typeof mockCollections;
  favoriteItems: typeof mockItems;
  pinnedItems: typeof mockItems;
  recentCollections: typeof mockCollections;
  recentItems: typeof mockItems;
  typeById: Map<string, DashboardItemType>;
};

export type SidebarData = {
  favoriteItemsCount: number;
  pinnedItemsCount: number;
  recentItemsCount: number;
  types: Array<DashboardItemType & { count: number; href: string }>;
  favoriteCollections: typeof mockCollections;
  recentCollections: typeof mockCollections;
};
