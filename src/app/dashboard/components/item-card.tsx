import { FileText, Pin, Star } from "lucide-react";

import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import {
  formatDate,
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import { cn } from "@/lib/utils";

export function ItemCard({
  collection,
  item,
  onOpen,
  type,
}: {
  collection?: DashboardCollection;
  item: DashboardItem;
  onOpen: () => void;
  type?: DashboardItemType;
}) {
  const Icon = type
    ? typeIconMap[type.icon as keyof typeof typeIconMap] ?? FileText
    : FileText;
  const iconClassName = type
    ? typeColorMap[type.color as keyof typeof typeColorMap] ?? typeColorMap.zinc
    : typeColorMap.zinc;

  return (
    <button
      aria-label={`Open item details for ${item.title}`}
      className="group flex min-h-44 w-full flex-col rounded-md border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            iconClassName
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{item.title}</h3>
            {item.isPinned && <Pin className="size-3.5 shrink-0" />}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.tags.slice(0, 3).map((tag) => (
          <span
            className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
        <span className="truncate">
          {collection?.name ?? type?.name ?? "Unsorted"}
        </span>
        <time className="shrink-0" dateTime={item.updatedAt.toISOString()}>
          {formatDate(item.updatedAt)}
        </time>
      </div>
    </button>
  );
}
