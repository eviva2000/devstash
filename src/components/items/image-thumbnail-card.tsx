import { Image as ImageIcon, Pin, Star } from "lucide-react";
import NextImage from "next/image";

import type {
  DashboardCollection,
  DashboardItem,
} from "@/features/dashboard/dashboard-types";
import { formatDate } from "@/features/dashboard/dashboard-utils";

export function ImageThumbnailCard({
  collection,
  item,
  onOpen,
}: {
  collection?: DashboardCollection;
  item: DashboardItem;
  onOpen: () => void;
}) {
  const imageUrl = item.fileUrl
    ? `/api/items/${encodeURIComponent(item.id)}/download?preview=1`
    : null;

  return (
    <button
      aria-label={`Open image details for ${item.title}`}
      className="group flex w-full flex-col overflow-hidden rounded-md border border-border bg-card text-left text-card-foreground transition-colors hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onOpen}
      type="button"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <NextImage
            alt={item.fileName ?? item.title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={imageUrl}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
      </div>

      <div className="flex min-h-28 flex-col gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{item.title}</h3>
            {item.isPinned && <Pin className="size-3.5 shrink-0" />}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description || item.fileName || "No description added."}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate">{collection?.name ?? "Unsorted"}</span>
          <time className="shrink-0" dateTime={item.updatedAt.toISOString()}>
            {formatDate(item.updatedAt)}
          </time>
        </div>
      </div>
    </button>
  );
}
