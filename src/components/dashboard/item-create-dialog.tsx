"use client";

import { FileText, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { createItem } from "@/actions/items";
import { AutoTagField } from "@/components/dashboard/auto-tag-field";
import { CodeEditor } from "@/components/dashboard/code-editor";
import { CodeLanguageSelect } from "@/components/dashboard/code-language-select";
import { CollectionSelector } from "@/components/dashboard/collection-selector";
import { FileUpload } from "@/components/dashboard/file-upload";
import { GenerateDescriptionButton } from "@/components/dashboard/generate-description-button";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DashboardCollection,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import {
  getTypeColorStyle,
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import type { UploadedFileMetadata, UploadItemType } from "@/lib/file-uploads";
import { getDefaultCodeLanguage } from "@/lib/code-languages";
import {
  doesTypeSupportContent,
  doesTypeSupportFile,
  doesTypeSupportLanguage,
  doesTypeSupportUrl,
  doesTypeUseCodeEditor,
  doesTypeUseMarkdownEditor,
  isCreatableItemType,
} from "@/lib/item-type-capabilities";
import { cn, getActionErrorMessage, parseTags } from "@/lib/utils";

type CreateItemFormState = {
  typeSlug: string;
  title: string;
  description: string;
  tags: string;
  content: string;
  language: string;
  url: string;
  collectionIds: string[];
  file: UploadedFileMetadata | null;
};

export function ItemCreateDialog({
  collections,
  initialTypeSlug,
  isPro,
  itemTypes,
  onOpenChange,
  open,
  triggerClassName,
  triggerLabel = "New Item",
}: {
  collections: DashboardCollection[];
  initialTypeSlug?: string;
  isPro: boolean;
  itemTypes: DashboardItemType[];
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
  const selectedType =
    availableTypes.find((type) => type.slug === form.typeSlug) ??
    availableTypes[0];
  const supportsContent = doesTypeSupportContent(form.typeSlug);
  const usesCodeEditor = doesTypeUseCodeEditor(form.typeSlug);
  const usesMarkdownEditor = doesTypeUseMarkdownEditor(form.typeSlug);
  const supportsLanguage = doesTypeSupportLanguage(form.typeSlug);
  const supportsUrl = doesTypeSupportUrl(form.typeSlug);
  const supportsFileUpload = doesTypeSupportFile(form.typeSlug);
  const isSubmitDisabled =
    isSaving ||
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
        onOpenChange={(open) => {
          if (isSaving) {
            return;
          }
          if (open) {
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
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
          >
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

                <section className="space-y-2">
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    disabled={isSaving || availableTypes.length === 0}
                    onValueChange={(value) => {
                      if (value) {
                        if (form.file) {
                          void cleanupPendingUpload(form.file.uploadToken);
                        }

                        updateForm({
                          typeSlug: value,
                          file: null,
                          language: doesTypeSupportLanguage(value)
                            ? getDefaultCodeLanguage(value)
                            : "",
                        });
                      }
                    }}
                    value={form.typeSlug}
                  >
                    <SelectTrigger aria-label="Item type">
                      <span className="flex min-w-0 items-center gap-2">
                        {selectedType && (
                          <TypeIconBadge type={selectedType} size="sm" />
                        )}
                        <SelectValue placeholder="Choose item type">
                          {(value) =>
                            availableTypes.find((type) => type.slug === value)
                              ?.name ?? "Choose item type"
                          }
                        </SelectValue>
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem
                          key={type.id}
                          label={type.name}
                          value={type.slug}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <TypeIconBadge type={type} />
                            <span className="truncate">{type.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                <section className="grid gap-4">
                  <CreateField label="Title" required>
                    <Input
                      autoFocus
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm({ title: event.target.value })
                      }
                      required
                      value={form.title}
                    />
                  </CreateField>

                  <CreateFieldBlock
                    action={
                      <GenerateDescriptionButton
                        content={supportsContent ? form.content : ""}
                        disabled={isSaving}
                        fileName={form.file?.fileName ?? ""}
                        isPro={isPro}
                        itemType={selectedType?.name ?? form.typeSlug}
                        language={supportsLanguage ? form.language : ""}
                        onGenerated={(description) =>
                          updateForm({ description })
                        }
                        tags={form.tags}
                        title={form.title}
                        url={supportsUrl ? form.url : ""}
                      />
                    }
                    className="pt-2"
                    label="Description"
                  >
                    <CreateTextarea
                      ariaLabel="Description"
                      disabled={isSaving}
                      onChange={(description) => updateForm({ description })}
                      rows={2}
                      value={form.description}
                    />
                  </CreateFieldBlock>

                  <AutoTagField
                    content={form.content}
                    disabled={isSaving}
                    isPro={isPro}
                    onChange={(tags) => updateForm({ tags })}
                    tags={form.tags}
                    title={form.title}
                  />

                  <CollectionSelector
                    collections={collections}
                    disabled={isSaving}
                    onChange={(collectionIds) => updateForm({ collectionIds })}
                    selectedIds={form.collectionIds}
                  />

                  {supportsLanguage && (
                    <CreateFieldBlock label="Language">
                      <CodeLanguageSelect
                        disabled={isSaving}
                        onChange={(language) => updateForm({ language })}
                        value={form.language}
                      />
                    </CreateFieldBlock>
                  )}

                  {supportsContent && (
                    usesCodeEditor ? (
                      <CreateFieldBlock label="Content">
                        <CodeEditor
                          ariaLabel="Content"
                          disabled={isSaving}
                          language={form.language}
                          minHeight={260}
                          onChange={(content) => updateForm({ content })}
                          value={form.content}
                        />
                      </CreateFieldBlock>
                    ) : usesMarkdownEditor ? (
                      <CreateFieldBlock label="Content">
                        <MarkdownEditor
                          ariaLabel="Content"
                          disabled={isSaving}
                          minHeight={260}
                          onChange={(content) => updateForm({ content })}
                          value={form.content}
                        />
                      </CreateFieldBlock>
                    ) : (
                      <CreateField label="Content">
                        <CreateTextarea
                          disabled={isSaving}
                          onChange={(content) => updateForm({ content })}
                          rows={5}
                          value={form.content}
                        />
                      </CreateField>
                    )
                  )}

                  {supportsUrl && (
                    <CreateField label="URL" required>
                      <Input
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm({ url: event.target.value })
                        }
                        required
                        type="url"
                        value={form.url}
                      />
                    </CreateField>
                  )}

                  {supportsFileUpload && (
                    <CreateFieldBlock label="Upload" required>
                      <FileUpload
                        disabled={isSaving}
                        itemType={form.typeSlug as UploadItemType}
                        onChange={(file) => {
                          updateForm({
                            file,
                            title:
                              form.title.trim().length === 0 && file
                                ? getTitleFromFileName(file.fileName)
                                : form.title,
                          });
                        }}
                        value={form.file}
                      />
                    </CreateFieldBlock>
                  )}
                </section>
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

function TypeIconBadge({
  size = "default",
  type,
}: {
  size?: "default" | "sm";
  type: DashboardItemType;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        size === "sm" ? "size-6" : "size-7",
        typeColorMap[type.color as keyof typeof typeColorMap] ??
          typeColorMap.zinc
      )}
      style={getTypeColorStyle(type.color)}
    >
      <SelectedTypeIcon type={type} />
    </span>
  );
}

function SelectedTypeIcon({ type }: { type: DashboardItemType }) {
  const Icon =
    typeIconMap[type.icon as keyof typeof typeIconMap] ??
    typeIconMap[type.slug as keyof typeof typeIconMap] ??
    FileText;

  return <Icon className="size-4" />;
}

function CreateField({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </label>
  );
}

function CreateFieldBlock({
  action,
  children,
  className,
  label,
  required = false,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={cn("block space-y-1.5", className)}>
      {action ? (
        <div className="flex min-h-8 items-center justify-between gap-2">
          <FieldLabel required={required}>{label}</FieldLabel>
          {action}
        </div>
      ) : (
        <FieldLabel required={required}>{label}</FieldLabel>
      )}
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

function CreateTextarea({
  ariaLabel,
  disabled,
  onChange,
  rows,
  value,
}: {
  ariaLabel?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      className="w-full resize-none rounded-lg border border-input bg-input/20 px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      value={value}
    />
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
