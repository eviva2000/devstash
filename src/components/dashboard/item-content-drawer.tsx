"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteItem, updateItem } from "@/actions/items";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type {
  DashboardCollection,
  DashboardItem,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import {
  doesTypeSupportContent,
  doesTypeSupportLanguage,
  doesTypeSupportUrl,
  doesTypeUseCodeEditor,
  doesTypeUseMarkdownEditor,
} from "@/lib/item-type-capabilities";
import { getActionErrorMessage, parseTags } from "@/lib/utils";

import { ItemDrawerDetails } from "./item-drawer/item-drawer-details";
import { ItemDrawerEditForm } from "./item-drawer/item-drawer-edit-form";
import { ItemDrawerSkeleton } from "./item-drawer/item-drawer-skeleton";
import {
  ItemDrawerEditToolbar,
  ItemDrawerHeader,
  ItemDrawerViewToolbar,
} from "./item-drawer/item-drawer-toolbar";
import { getEditFormState, toItemDetail } from "./item-drawer/item-drawer-utils";
import type { EditFormState } from "./item-drawer/types";
import { useItemDetail } from "./item-drawer/use-item-detail";

export function ItemContentDrawer({
  collections,
  isOpen,
  isPro,
  item,
  itemId,
  onClose,
  onClosed,
  type,
}: Readonly<{
  collections: DashboardCollection[];
  isOpen: boolean;
  isPro: boolean;
  item?: DashboardItem;
  itemId: string | null;
  onClose: () => void;
  onClosed?: () => void;
  type?: DashboardItemType;
}>) {
  const router = useRouter();
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(() =>
    getEditFormState(null)
  );
  const [formError, setFormError] = useState("");

  const { activeDetail, activeError, isLoading, setItemDetail } = useItemDetail({
    isOpen,
    itemId,
    onLoad: (loaded) => {
      setIsEditing(false);
      setEditForm(getEditFormState(loaded));
      setFormError("");
    },
  });

  const displayType = activeDetail?.type ?? type;
  const displayCollection = activeDetail?.collection ?? item?.collection ?? null;
  const displayItem = activeDetail ?? item ?? null;
  const hasCopied = copiedItemId === itemId;
  const supportsContent = doesTypeSupportContent(displayType?.slug);
  const usesCodeEditor = doesTypeUseCodeEditor(displayType?.slug);
  const usesMarkdownEditor = doesTypeUseMarkdownEditor(displayType?.slug);
  const supportsLanguage = doesTypeSupportLanguage(displayType?.slug);
  const supportsUrl = doesTypeSupportUrl(displayType?.slug);
  const isSaveDisabled = isSaving || editForm.title.trim().length === 0;
  const copyValue = useMemo(
    () =>
      activeDetail?.content ??
      activeDetail?.url ??
      activeDetail?.fileName ??
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
        collectionIds: editForm.collectionIds,
      });
    } catch (error) {
      console.error("Failed to save item.", error);
      result = {
        success: false,
        error: getActionErrorMessage(error, "Unable to update item. Try again."),
      };
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
      result = {
        success: false,
        error: getActionErrorMessage(error, "Unable to delete item. Try again."),
      };
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
          <ItemDrawerHeader
            displayCollection={displayCollection}
            displayItem={displayItem}
            displayType={displayType}
            onClose={handleClose}
          />

          {isEditing ? (
            <ItemDrawerEditToolbar
              isSaveDisabled={isSaveDisabled}
              isSaving={isSaving}
              onCancelEditing={cancelEditing}
              onSave={handleSave}
            />
          ) : (
            <ItemDrawerViewToolbar
              activeDetail={activeDetail}
              copyValue={copyValue}
              displayItem={displayItem}
              hasCopied={hasCopied}
              isDeleteDialogOpen={isDeleteDialogOpen}
              isDeleting={isDeleting}
              isLoading={isLoading}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onDeleteDialogOpenChange={setIsDeleteDialogOpen}
              onStartEditing={startEditing}
            />
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
                collections={collections}
                error={formError}
                form={editForm}
                item={activeDetail}
                isPro={isPro}
                isSaving={isSaving}
                onChange={setEditForm}
                supportsContent={supportsContent}
                supportsLanguage={supportsLanguage}
                supportsUrl={supportsUrl}
                type={displayType}
                usesCodeEditor={usesCodeEditor}
                usesMarkdownEditor={usesMarkdownEditor}
              />
            )}

            {!isLoading && !activeError && activeDetail && !isEditing && (
              <ItemDrawerDetails
                collection={displayCollection}
                item={activeDetail}
                type={displayType}
                usesCodeEditor={usesCodeEditor}
                usesMarkdownEditor={usesMarkdownEditor}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
