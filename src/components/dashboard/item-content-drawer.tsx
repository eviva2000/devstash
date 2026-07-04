"use client";

import {
  Check,
  Copy,
  FileText,
  Loader2,
  Pencil,
  Pin,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteItem, updateItem } from "@/actions/items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DashboardItemDetail,
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

type EditFormState = {
  title: string;
  description: string;
  tags: string;
  content: string;
  language: string;
  url: string;
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
  const router = useRouter();
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [loadError, setLoadError] = useState<{
    itemId: string;
    message: string;
  } | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() =>
    getEditFormState(null)
  );
  const [formError, setFormError] = useState("");

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
        setIsEditing(false);
        setEditForm(getEditFormState(payload.item));
        setFormError("");
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
  const supportsContent = doesTypeSupportContent(displayType?.slug);
  const supportsLanguage = doesTypeSupportLanguage(displayType?.slug);
  const supportsUrl = doesTypeSupportUrl(displayType?.slug);
  const isSaveDisabled = isSaving || editForm.title.trim().length === 0;
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

  function handleClose() {
    setIsEditing(false);
    setFormError("");
    setIsDeleteDialogOpen(false);
    onClose();
  }

  function startEditing() {
    if (!activeDetail) {
      return;
    }

    setEditForm(getEditFormState(activeDetail));
    setFormError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setEditForm(getEditFormState(activeDetail));
    setFormError("");
    setIsEditing(false);
  }

  async function handleSave() {
    if (!itemId || !activeDetail) {
      return;
    }

    setIsSaving(true);
    setFormError("");

    let result: Awaited<ReturnType<typeof updateItem>>;
    try {
      result = await updateItem(itemId, {
        title: editForm.title,
        description: editForm.description,
        tags: parseTags(editForm.tags),
        content: supportsContent ? editForm.content : null,
        language: supportsLanguage ? editForm.language : null,
        url: supportsUrl ? editForm.url : null,
      });
    } catch (error) {
      console.error("Failed to save item.", error);
      const message =
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Unable to update item. Try again.";
      result = { success: false, error: message };
    } finally {
      setIsSaving(false);
    }

    if (!result.success) {
      setFormError(result.error);
      toast.error(result.error);
      return;
    }

    const updatedItem = toItemDetail(result.data);
    setItemDetail(updatedItem);
    setEditForm(getEditFormState(updatedItem));
    setIsEditing(false);
    toast.success("Item saved.");
    router.refresh();
  }

  async function handleDelete() {
    if (!itemId) {
      return;
    }

    setIsDeleting(true);

    let result: Awaited<ReturnType<typeof deleteItem>>;
    try {
      result = await deleteItem(itemId);
    } catch (error) {
      console.error("Failed to delete item.", error);
      const message =
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Unable to delete item. Try again.";
      result = { success: false, error: message };
    } finally {
      setIsDeleting(false);
    }

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setIsDeleteDialogOpen(false);
    toast.success("Item deleted.");
    onClose();
    router.refresh();
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
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
                onClick={handleClose}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
          </div>

          {isEditing ? (
            <div className="flex shrink-0 items-center gap-2 border-y border-border px-8 py-4">
              <Button
                disabled={isSaving}
                onClick={cancelEditing}
                size="sm"
                type="button"
                variant="outline"
              >
                <X />
                Cancel
              </Button>
              <Button
                className="ml-auto"
                disabled={isSaveDisabled}
                onClick={handleSave}
                size="sm"
                type="button"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                Save
              </Button>
            </div>
          ) : (
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
                disabled={!activeDetail}
                onClick={startEditing}
                size="icon"
                title="Edit"
                type="button"
                variant="ghost"
              >
                <Pencil />
              </Button>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                  if (isDeleting) {
                    return;
                  }
                  setIsDeleteDialogOpen(open);
                }}
              >
                <Button
                  aria-label="Delete item"
                  className="ml-auto"
                  disabled={!activeDetail}
                  onClick={() => setIsDeleteDialogOpen(true)}
                  size="icon"
                  title="Delete"
                  type="button"
                  variant="destructive"
                >
                  <Trash2 />
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {displayItem?.title
                        ? `"${displayItem.title}" will be permanently deleted. This action cannot be undone.`
                        : "This item will be permanently deleted. This action cannot be undone."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={isDeleting}
                      onClick={(event) => {
                        event.preventDefault();
                        void handleDelete();
                      }}
                      variant="destructive"
                    >
                      {isDeleting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            {isLoading && <ItemDrawerSkeleton />}

            {!isLoading && activeError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {activeError}
              </div>
            )}

            {!isLoading && !activeError && activeDetail && isEditing && (
              <ItemDrawerEditForm
                collection={displayCollection}
                error={formError}
                form={editForm}
                item={activeDetail}
                isSaving={isSaving}
                onChange={setEditForm}
                supportsContent={supportsContent}
                supportsLanguage={supportsLanguage}
                supportsUrl={supportsUrl}
                type={displayType}
              />
            )}

            {!isLoading && !activeError && activeDetail && !isEditing && (
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

function ItemDrawerEditForm({
  collection,
  error,
  form,
  item,
  isSaving,
  onChange,
  supportsContent,
  supportsLanguage,
  supportsUrl,
  type,
}: {
  collection: DashboardCollection | null;
  error: string;
  form: EditFormState;
  item: ItemDetail;
  isSaving: boolean;
  onChange: React.Dispatch<React.SetStateAction<EditFormState>>;
  supportsContent: boolean;
  supportsLanguage: boolean;
  supportsUrl: boolean;
  type?: DashboardItemType;
}) {
  return (
    <div className="space-y-7">
      {error && (
        <p
          aria-live="polite"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <section className="space-y-4">
        <EditField label="Title" required>
          <Input
            disabled={isSaving}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            required
            value={form.title}
          />
        </EditField>

        <EditField label="Description">
          <EditTextarea
            disabled={isSaving}
            onChange={(value) =>
              onChange((current) => ({ ...current, description: value }))
            }
            rows={4}
            value={form.description}
          />
        </EditField>

        <EditField label="Tags">
          <Input
            disabled={isSaving}
            onChange={(event) =>
              onChange((current) => ({ ...current, tags: event.target.value }))
            }
            placeholder="react, terminal, workflow"
            value={form.tags}
          />
        </EditField>

        {supportsContent && (
          <EditField label="Content">
            <EditTextarea
              disabled={isSaving}
              onChange={(value) =>
                onChange((current) => ({ ...current, content: value }))
              }
              rows={9}
              value={form.content}
            />
          </EditField>
        )}

        {supportsLanguage && (
          <EditField label="Language">
            <Input
              disabled={isSaving}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  language: event.target.value,
                }))
              }
              value={form.language}
            />
          </EditField>
        )}

        {supportsUrl && (
          <EditField label="URL">
            <Input
              disabled={isSaving}
              onChange={(event) =>
                onChange((current) => ({ ...current, url: event.target.value }))
              }
              type="url"
              value={form.url}
            />
          </EditField>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <DrawerMeta label="Type" value={type?.name ?? "Unknown"} />
        <DrawerMeta label="Collection" value={collection?.name ?? "Unsorted"} />
        <DrawerMeta label="Created" value={formatApiDate(item.createdAt)} />
        <DrawerMeta label="Updated" value={formatApiDate(item.updatedAt)} />
      </section>
    </div>
  );
}

function EditField({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function EditTextarea({
  disabled,
  onChange,
  rows,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <textarea
      className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      value={value}
    />
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

function getEditFormState(item: ItemDetail | null): EditFormState {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    tags: item?.tags.join(", ") ?? "",
    content: item?.content ?? "",
    language: item?.language ?? "",
    url: item?.url ?? "",
  };
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function doesTypeSupportContent(slug?: string) {
  return slug
    ? ["snippet", "prompt", "command", "note"].includes(slug)
    : false;
}

function doesTypeSupportLanguage(slug?: string) {
  return slug ? ["snippet", "command"].includes(slug) : false;
}

function doesTypeSupportUrl(slug?: string) {
  return slug === "link";
}

function toItemDetail(item: DashboardItemDetail | ItemDetail): ItemDetail {
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
