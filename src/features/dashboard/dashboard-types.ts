export type DashboardCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isFavorite: boolean;
  itemCount: number;
<<<<<<< HEAD
  dominantType?: {
    icon?: string | null;
    color?: string | null;
  } | null;
=======
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
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
<<<<<<< HEAD
=======
  collection?: DashboardCollection | null;
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
  content?: string | null;
  language?: string | null;
  url?: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
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
<<<<<<< HEAD
=======
};

export type DashboardItemStats = {
  total: number;
  favorites: number;
  pinned: number;
>>>>>>> 3df3759463c9cff56d825788930f4cd37c30d35a
};
