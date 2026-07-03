"use client";

import {
  Check,
  Copy,
  FileText,
  Pencil,
  Pin,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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

type ItemDetail = Omit<
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

type ItemDetailResponse = {
  item?: ItemDetail;
  error?: string;
};

export function ItemContentDrawer({
  isOpen,
  item,
  itemId,
  onClose,
  onClosed,
  type,
}: {
  isOpen: boolean;
  item?: DashboardItem;
  itemId: string | null;
  onClose: () => void;
  onClosed?: () => void;
  type?: DashboardItemType;
}) {
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [loadError, setLoadError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !itemId) {
      return;
    }

    const controller = new AbortController();
    const currentItemId = itemId;

    async function fetchItemDetail() {
      try {
        const response = await fetch(
          `/api/items/${encodeURIComponent(currentItemId)}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        const payload = (await response.json()) as ItemDetailResponse;

        if (!response.ok || !payload.item) {
          throw new Error(payload.error ?? "Unable to load item details.");
        }

        setItemDetail(payload.item);
        setLoadError(null);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }

        setLoadError({
          itemId: currentItemId,
          message:
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load item details.",
        });
      }
    }

    void fetchItemDetail();

    return () => controller.abort();
  }, [isOpen, itemId]);

  const activeDetail = itemDetail?.id === itemId ? itemDetail : null;
  const activeError = loadError?.itemId === itemId ? loadError.message : null;
  const isLoading = isOpen && Boolean(itemId) && !activeDetail && !activeError;
  const displayType = activeDetail?.type ?? type;
  const displayCollection = activeDetail?.collection ?? item?.collection ?? null;
  const displayItem = activeDetail ?? item ?? null;
  const hasCopied = copiedItemId === itemId;
  const Icon = displayType
    ? typeIconMap[displayType.icon as keyof typeof typeIconMap] ?? FileText
    : FileText;
  const iconClassName = displayType
    ? typeColorMap[displayType.color as keyof typeof typeColorMap] ??
      typeColorMap.zinc
    : typeColorMap.zinc;
  const copyValue = useMemo(
    () =>
      activeDetail?.content ??
      activeDetail?.url ??
      activeDetail?.fileUrl ??
      displayItem?.description ??
      displayItem?.title ??
      "",
    [activeDetail, displayItem?.description, displayItem?.title]
  );

  async function handleCopy() {
    if (!copyValue) {
      return;
    }

    await navigator.clipboard.writeText(copyValue);
    setCopiedItemId(itemId);
    window.setTimeout(() => {
      setCopiedItemId((currentItemId) =>
        currentItemId === itemId ? null : currentItemId
      );
    }, 1600);
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      onOpenChangeComplete={(open) => {
        if (!open) {
          onClosed?.();
        }
      }}
    >
      <SheetContent
        className="max-w-[520px] bg-background p-0 sm:max-w-[520px]"
        showCloseButton={false}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-8 pb-4 pt-6">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md",
                  iconClassName
                )}
                style={getTypeColorStyle(displayType?.color)}
              >
                <Icon className="size-5" />
              </span>
              <SheetHeader className="min-w-0 flex-1 pr-8">
                <SheetTitle className="truncate text-lg">
                  {displayItem?.title ?? "Item details"}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-2">
                  {displayType?.name && (
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-foreground">
                      {displayType.name}
                    </span>
                  )}
                  {displayCollection?.name && (
                    <span className="truncate text-xs">
                      in {displayCollection.name}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>
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
          </div>

          <div className="flex shrink-0 items-center gap-2 border-y border-border px-8 py-4">
            <Button
              aria-label={
                displayItem?.isFavorite
                  ? "Item is favorited"
                  : "Item is not favorited"
              }
              aria-pressed={displayItem?.isFavorite ?? false}
              className={cn(
                displayItem?.isFavorite &&
                  "text-amber-400 hover:text-amber-300"
              )}
              size="icon"
              title="Favorite"
              type="button"
              variant="outline"
            >
              <Star
                className={cn(
                  displayItem?.isFavorite && "fill-amber-400 text-amber-400"
                )}
              />
            </Button>
            <Button
              aria-label={displayItem?.isPinned ? "Item is pinned" : "Pin item"}
              aria-pressed={displayItem?.isPinned ?? false}
              size="icon"
              title="Pin"
              type="button"
              variant="outline"
            >
              <Pin className={cn(displayItem?.isPinned && "fill-foreground")} />
            </Button>
            <Button
              disabled={!copyValue || isLoading}
              onClick={handleCopy}
              size="sm"
              title="Copy item content"
              type="button"
              variant="outline"
            >
              {hasCopied ? <Check /> : <Copy />}
              {hasCopied ? "Copied" : "Copy"}
            </Button>
            <Button
              aria-label="Edit item"
              disabled
              size="icon"
              title="Edit"
              type="button"
              variant="ghost"
            >
              <Pencil />
            </Button>
            <Button
              aria-label="Delete item"
              className="ml-auto"
              disabled
              size="icon"
              title="Delete"
              type="button"
              variant="destructive"
            >
              <Trash2 />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            {isLoading && <ItemDrawerSkeleton />}

            {!isLoading && activeError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {activeError}
              </div>
            )}

            {!isLoading && !activeError && activeDetail && (
              <ItemDrawerDetails
                collection={displayCollection}
                item={activeDetail}
                type={displayType}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ItemDrawerDetails({
  collection,
  item,
  type,
}: {
  collection: DashboardCollection | null;
  item: ItemDetail;
  type?: DashboardItemType;
}) {
  return (
    <div className="space-y-7">
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Description
        </h3>
        <p className="text-sm leading-6 text-foreground">
          {item.description || "No description added."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <DrawerMeta label="Type" value={type?.name ?? "Unknown"} />
        <DrawerMeta label="Collection" value={collection?.name ?? "Unsorted"} />
        {item.language && <DrawerMeta label="Language" value={item.language} />}
        <DrawerMeta label="Created" value={formatApiDate(item.createdAt)} />
        <DrawerMeta label="Updated" value={formatApiDate(item.updatedAt)} />
        {item.lastUsedAt && (
          <DrawerMeta label="Last used" value={formatApiDate(item.lastUsedAt)} />
        )}
      </section>

      {item.url && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">URL</h3>
          <a
            className="block truncate rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground transition-colors hover:text-primary"
            href={item.url}
            rel="noreferrer"
            target="_blank"
          >
            {item.url}
          </a>
        </section>
      )}

      {(item.fileName || item.fileUrl) && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">File</h3>
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <p className="font-medium">{item.fileName ?? "Attached file"}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {item.fileMimeType && <span>{item.fileMimeType}</span>}
              {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
            </div>
            {item.fileUrl && (
              <a
                className="mt-2 block truncate text-primary hover:underline"
                href={item.fileUrl}
                rel="noreferrer"
                target="_blank"
              >
                {item.fileUrl}
              </a>
            )}
          </div>
        </section>
      )}

      {item.content && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Content</h3>
          <pre className="max-h-[360px] overflow-auto rounded-md border border-border bg-card p-4 text-sm leading-6 text-card-foreground">
            <code>{item.content}</code>
          </pre>
        </section>
      )}

      {item.tags.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
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
        </section>
      )}
    </div>
  );
}

function ItemDrawerSkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-16" key={index} />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-52 w-full" />
      </div>
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

function formatApiDate(value: string) {
  return formatDate(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
