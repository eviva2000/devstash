import type { DashboardItemDetail } from "@/features/dashboard/dashboard-types";
import { formatDate } from "@/features/dashboard/dashboard-utils";

import type { EditFormState, ItemDetail } from "./types";

export function formatApiDate(value: string) {
  return formatDate(new Date(value));
}

export function getDownloadUrl(item: Pick<ItemDetail, "id">) {
  return `/api/items/${encodeURIComponent(item.id)}/download`;
}

export function isImageItem(item: ItemDetail) {
  return item.fileMimeType?.startsWith("image/") ?? false;
}

export function getEditFormState(item: ItemDetail | null): EditFormState {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    tags: item?.tags.join(", ") ?? "",
    content: item?.content ?? "",
    language: item?.language ?? "",
    url: item?.url ?? "",
  };
}

export function toItemDetail(
  item: DashboardItemDetail | ItemDetail
): ItemDetail {
  return {
    ...item,
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
    lastUsedAt: item.lastUsedAt ? toIsoString(item.lastUsedAt) : null,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
