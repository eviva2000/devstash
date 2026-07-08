"use client";

import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Pencil,
  Pin,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";

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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import {
  getTypeColorStyle,
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import { cn } from "@/lib/utils";

import { getDownloadUrl } from "./item-drawer-utils";
import type { ItemDetail } from "./types";

type DisplayItem = DashboardItem | ItemDetail;

export function ItemDrawerHeader({
  displayCollection,
  displayItem,
  displayType,
  onClose,
}: Readonly<{
  displayCollection: DashboardCollection | null;
  displayItem: DisplayItem | null;
  displayType?: DashboardItemType;
  onClose: () => void;
}>) {
  const Icon = displayType
    ? typeIconMap[displayType.icon as keyof typeof typeIconMap] ?? FileText
    : FileText;
  const iconClassName = displayType
    ? typeColorMap[displayType.color as keyof typeof typeColorMap] ??
      typeColorMap.zinc
    : typeColorMap.zinc;

  return (
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
  );
}

export function ItemDrawerEditToolbar({
  isSaveDisabled,
  isSaving,
  onCancelEditing,
  onSave,
}: Readonly<{
  isSaveDisabled: boolean;
  isSaving: boolean;
  onCancelEditing: () => void;
  onSave: () => void;
}>) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-y border-border px-8 py-4">
      <Button
        disabled={isSaving}
        onClick={onCancelEditing}
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
        onClick={onSave}
        size="sm"
        type="button"
      >
        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
        Save
      </Button>
    </div>
  );
}

export function ItemDrawerViewToolbar({
  activeDetail,
  copyValue,
  displayItem,
  hasCopied,
  isDeleteDialogOpen,
  isDeleting,
  isLoading,
  onCopy,
  onDelete,
  onDeleteDialogOpenChange,
  onStartEditing,
}: Readonly<{
  activeDetail: ItemDetail | null;
  copyValue: string;
  displayItem: DisplayItem | null;
  hasCopied: boolean;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onStartEditing: () => void;
}>) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-y border-border px-8 py-4">
      <Button
        aria-label={
          displayItem?.isFavorite
            ? "Item is favorited"
            : "Item is not favorited"
        }
        aria-pressed={displayItem?.isFavorite ?? false}
        className={cn(
          displayItem?.isFavorite && "text-amber-400 hover:text-amber-300"
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
        onClick={onCopy}
        size="sm"
        title="Copy item content"
        type="button"
        variant="outline"
      >
        {hasCopied ? <Check /> : <Copy />}
        {hasCopied ? "Copied" : "Copy"}
      </Button>
      {activeDetail?.fileUrl && (
        <a
          className={buttonVariants({ size: "sm", variant: "outline" })}
          href={getDownloadUrl(activeDetail)}
        >
          <Download />
          Download
        </a>
      )}
      <Button
        aria-label="Edit item"
        disabled={!activeDetail}
        onClick={onStartEditing}
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
          onDeleteDialogOpenChange(open);
        }}
      >
        <Button
          aria-label="Delete item"
          className="ml-auto"
          disabled={!activeDetail}
          onClick={() => onDeleteDialogOpenChange(true)}
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                onDelete();
              }}
              variant="destructive"
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
