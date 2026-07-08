import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";

export type ItemDetail = Omit<
  DashboardItem,
  "createdAt" | "updatedAt" | "collection"
> & {
  collection?: DashboardCollection | null;
  contentType: string;
  createdAt: string;
  fileMimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
  lastUsedAt?: string | null;
  type: DashboardItemType;
  updatedAt: string;
};

export type ItemDetailResponse = {
  item?: ItemDetail;
  error?: string;
};

export type EditFormState = {
  title: string;
  description: string;
  tags: string;
  content: string;
  language: string;
  url: string;
  collectionIds: string[];
};
