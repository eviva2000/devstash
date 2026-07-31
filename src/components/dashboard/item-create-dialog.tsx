"use client";

import { Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { createItem } from "@/actions/items";
import { ItemCreateFormFields } from "@/components/dashboard/item-create-dialog/item-create-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  DashboardCollection,
  DashboardItemType,
  DashboardPlanUsage,
} from "@/features/dashboard/dashboard-types";
import { getDefaultCodeLanguage } from "@/lib/code-languages";
import type { UploadedFileMetadata } from "@/lib/file-uploads";
import {
  doesTypeSupportContent,
  doesTypeSupportFile,
  doesTypeSupportLanguage,
  doesTypeSupportUrl,
  isCreatableItemType,
} from "@/lib/item-type-capabilities";
import { getActionErrorMessage, parseTags } from "@/lib/utils";

import type { CreateItemFormState } from "./item-create-dialog/types";

export function ItemCreateDialog({
  collections,
  initialTypeSlug,
  isPro,
  itemTypes,
  usage,
  onOpenChange,
  open,
  triggerClassName,
  triggerLabel = "New Item",
}: {
  collections: DashboardCollection[];
  initialTypeSlug?: string;
  isPro: boolean;
  itemTypes: DashboardItemType[];
  usage: DashboardPlanUsage;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const availableTypes = useMemo(
    () => itemTypes.filter((type) => isCreatableItemType(type.slug)),
    [itemTypes]
  );
  const fallbackTypeSlug = availableTypes[0]?.slug ?? "snippet";
  const defaultTypeSlug =
    initialTypeSlug && isCreatableItemType(initialTypeSlug)
      ? initialTypeSlug
      : fallbackTypeSlug;
  const [form, setForm] = useState<CreateItemFormState>(() =>
    getInitialForm(defaultTypeSlug)
  );
  const [formError, setFormError] = useState("");
  const isOpen = open ?? uncontrolledOpen;
  const supportsContent = doesTypeSupportContent(form.typeSlug);
  const supportsLanguage = doesTypeSupportLanguage(form.typeSlug);
  const supportsUrl = doesTypeSupportUrl(form.typeSlug);
  const supportsFileUpload = doesTypeSupportFile(form.typeSlug);
  const isUploadBlocked = supportsFileUpload && !isPro;
  const isItemLimitReached =
    usage.itemLimit !== null && usage.itemUsed >= usage.itemLimit;
  const isSubmitDisabled =
    isSaving ||
    isUploadBlocked ||
    isItemLimitReached ||
    availableTypes.length === 0 ||
    form.title.trim().length === 0 ||
    (supportsUrl && form.url.trim().length === 0) ||
    (supportsFileUpload && !form.file);

  function updateForm(patch: Partial<CreateItemFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function setDialogOpen(nextOpen: boolean) {
    if (open === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function openDialog() {
    setForm(getInitialForm(defaultTypeSlug));
    setFormError("");
    setIsSaving(false);
    setDialogOpen(true);
  }

  function closeDialog({ cleanupUpload = true } = {}) {
    if (cleanupUpload && form.file) {
      void cleanupPendingUpload(form.file.uploadToken);
    }

    setDialogOpen(false);
    setForm(getInitialForm(defaultTypeSlug));
    setFormError("");
    setIsSaving(false);
  }

  function handleTypeChange(typeSlug: string) {
    if (!typeSlug) {
      return;
    }

    if (form.file) {
      void cleanupPendingUpload(form.file.uploadToken);
    }

    updateForm({
      typeSlug,
      file: null,
      language: doesTypeSupportLanguage(typeSlug)
        ? getDefaultCodeLanguage(typeSlug)
        : "",
    });
  }

  function handleFileChange(file: UploadedFileMetadata | null) {
    updateForm({
      file,
      title:
        form.title.trim().length === 0 && file
          ? getTitleFromFileName(file.fileName)
          : form.title,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    let result: Awaited<ReturnType<typeof createItem>>;
    try {
      result = await createItem({
        typeSlug: form.typeSlug,
        title: form.title,
        description: form.description,
        tags: parseTags(form.tags),
        content: supportsContent ? form.content : null,
        language: supportsLanguage ? form.language : null,
        url: supportsUrl ? form.url : null,
        collectionIds: form.collectionIds,
        file: supportsFileUpload ? form.file : null,
      });
    } catch (error) {
      console.error("Failed to create item.", error);
      result = {
        success: false,
        code: "UNAVAILABLE",
        error: getActionErrorMessage(error, "Unable to create item. Try again."),
      };
    } finally {
      setIsSaving(false);
    }

    if (!result.success) {
      setFormError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Item created.");
    closeDialog({ cleanupUpload: false });
    router.refresh();
  }

  return (
    <>
      <Button
        className={triggerClassName ?? "ml-auto sm:ml-0"}
        onClick={openDialog}
        type="button"
      >
        <Plus data-icon="inline-start" />
        {triggerLabel}
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (isSaving) {
            return;
          }
          if (nextOpen) {
            openDialog();
            return;
          }
          closeDialog();
        }}
      >
        <DialogContent
          className="max-h-[calc(100dvh-1rem)] max-w-xl sm:max-h-[min(720px,calc(100dvh-2rem))]"
          showCloseButton={!isSaving}
        >
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
              <DialogHeader className="pr-8">
                <DialogTitle>Create Item</DialogTitle>
                <DialogDescription className="sr-only">
                  Create a new item.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-5">
              <div className="space-y-4">
                {formError && (
                  <p
                    aria-live="polite"
                    className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {formError}
                  </p>
                )}

                {(isItemLimitReached || isUploadBlocked) && (
                  <div
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
                    role="status"
                  >
                    <p className="font-medium">
                      {isItemLimitReached
                        ? `Item limit reached: ${usage.itemUsed} / ${usage.itemLimit}`
                        : usage.billingStatus === "PAST_DUE"
                          ? "File and image uploads are paused while billing is past due."
                          : "File and image uploads require an active Pro subscription."}
                    </p>
                    <Link
                      className="mt-1 inline-flex text-primary underline-offset-4 hover:underline"
                      href="/profile"
                    >
                      {usage.billingStatus === "PAST_DUE"
                        ? "Manage billing"
                        : "View upgrade options"}
                    </Link>
                  </div>
                )}

                <ItemCreateFormFields
                  availableTypes={availableTypes}
                  collections={collections}
                  form={form}
                  isPro={isPro}
                  isSaving={isSaving}
                  isUploadBlocked={isUploadBlocked}
                  onFileChange={handleFileChange}
                  onTypeChange={handleTypeChange}
                  onUpdate={updateForm}
                />
              </div>
            </div>

            <DialogFooter className="p-3">
              <Button
                disabled={isSaving}
                onClick={() => closeDialog()}
                type="button"
                variant="outline"
              >
                <X />
                Cancel
              </Button>
              <Button disabled={isSubmitDisabled} type="submit">
                {isSaving ? <Loader2 className="animate-spin" /> : <Plus />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getInitialForm(typeSlug: string): CreateItemFormState {
  return {
    typeSlug,
    title: "",
    description: "",
    tags: "",
    content: "",
    language: doesTypeSupportLanguage(typeSlug)
      ? getDefaultCodeLanguage(typeSlug)
      : "",
    url: "",
    collectionIds: [],
    file: null,
  };
}

function getTitleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

async function cleanupPendingUpload(uploadToken: string) {
  await fetch("/api/uploads", {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uploadToken }),
  });
}
