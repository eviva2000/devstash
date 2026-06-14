import { FileText, Pin, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import {
  formatDate,
  getTypeColorStyle,
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import { cn } from "@/lib/utils";

export function ItemContentDrawer({
  collection,
  isOpen,
  item,
  onClose,
  onExited,
  type,
}: {
  collection?: DashboardCollection;
  isOpen: boolean;
  item?: DashboardItem;
  onClose: () => void;
  onExited: () => void;
  type?: DashboardItemType;
}) {
  if (!item) {
    return null;
  }

  const Icon = type
    ? typeIconMap[type.icon as keyof typeof typeIconMap] ?? FileText
    : FileText;
  const iconClassName = type
    ? typeColorMap[type.color as keyof typeof typeColorMap] ?? typeColorMap.zinc
    : typeColorMap.zinc;
  const content = "content" in item ? item.content : undefined;
  const url = "url" in item ? item.url : undefined;
  const language = "language" in item ? item.language : undefined;

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        "fixed inset-0 z-40 transition",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <button
        aria-label="Dismiss item details"
        className={cn(
          "absolute inset-0 bg-background/60 transition-opacity duration-200 ease-out",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        type="button"
      />

      <aside
        aria-labelledby="item-drawer-title"
        aria-modal="true"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-background text-foreground shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onTransitionEnd={(event) => {
          if (event.currentTarget === event.target && !isOpen) {
            onExited();
          }
        }}
        role="dialog"
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-md",
              iconClassName
            )}
            style={getTypeColorStyle(type?.color)}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {type?.name ?? "Item"}
            </p>
            <h2
              className="truncate text-sm font-semibold"
              id="item-drawer-title"
            >
              {item.title}
            </h2>
          </div>
          <Button
            aria-label="Close item details"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {item.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    <Pin className="size-3" />
                    Pinned
                  </span>
                )}
                {item.isFavorite && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-400">
                    <Star className="size-3 fill-amber-400" />
                    Favorite
                  </span>
                )}
                {language && (
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {language}
                  </span>
                )}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DrawerMeta
                label="Collection"
                value={collection?.name ?? "Unsorted"}
              />
              <DrawerMeta label="Type" value={type?.name ?? "Unknown"} />
              <DrawerMeta label="Created" value={formatDate(item.createdAt)} />
              <DrawerMeta label="Updated" value={formatDate(item.updatedAt)} />
            </div>

            {item.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {url && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">URL</h3>
                <a
                  className="block truncate rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {url}
                </a>
              </div>
            )}

            {content && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Content</h3>
                <pre className="max-h-72 overflow-auto rounded-md border border-border bg-card p-3 text-sm leading-6 text-card-foreground">
                  <code>{content}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function DrawerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
