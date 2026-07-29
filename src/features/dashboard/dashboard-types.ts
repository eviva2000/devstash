export type DashboardCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isFavorite: boolean;
  itemCount: number;
  dominantType?: {
    icon?: string | null;
    color?: string | null;
  } | null;
  types?: Array<{
    color?: string | null;
    icon?: string | null;
    name: string;
    slug?: string;
  }>;
};

export type DashboardItemType = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  isSystem?: boolean;
};

export type DashboardItem = {
  id: string;
  title: string;
  description: string;
  typeId: string;
  collectionId: string | null;
  collection?: DashboardCollection | null;
  collectionIds: string[];
  collections: DashboardCollection[];
  content?: string | null;
  language?: string | null;
  url?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  isFavorite: boolean;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardItemDetail = DashboardItem & {
  contentType: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  lastUsedAt?: Date | null;
  type: DashboardItemType;
};

export type GlobalSearchItem = {
  id: string;
  title: string;
  preview: string;
  type: DashboardItemType;
};

export type GlobalSearchCollection = {
  id: string;
  name: string;
  itemCount: number;
};

export type DashboardData = {
  collectionById: Map<string, DashboardCollection>;
  favoriteCollections: DashboardCollection[];
  favoriteItems: DashboardItem[];
  pinnedItems: DashboardItem[];
  recentCollections: DashboardCollection[];
  recentItems: DashboardItem[];
  typeById: Map<string, DashboardItemType>;
};

export type DashboardItemStats = {
  total: number;
  favorites: number;
  pinned: number;
  recent: number;
};

export type SidebarData = {
  totalItemsCount: number;
  favoriteItemsCount: number;
  pinnedItemsCount: number;
  recentItemsCount: number;
  types: Array<DashboardItemType & { count: number; href: string }>;
  favoriteCollections: DashboardCollection[];
  recentCollections: DashboardCollection[];
};

export type DashboardUser = {
  name: string;
  email?: string | null;
  image?: string | null;
};

export type DashboardPlanUsage = {
  itemUsed: number;
  itemLimit: number | null;
  collectionUsed: number;
  collectionLimit: number | null;
  billingStatus: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
};
