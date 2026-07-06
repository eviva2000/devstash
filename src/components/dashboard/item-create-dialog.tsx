"use client";

import { FileText, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { createItem } from "@/actions/items";
import { CodeEditor } from "@/components/dashboard/code-editor";
import { FileUpload } from "@/components/dashboard/file-upload";
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
import type { DashboardItemType } from "@/features/dashboard/dashboard-types";
import {
  getTypeColorStyle,
  typeColorMap,
  typeIconMap,
} from "@/features/dashboard/dashboard-utils";
import type { UploadedFileMetadata, UploadItemType } from "@/lib/file-uploads";
import { cn } from "@/lib/utils";

type CreateItemFormState = {
  typeSlug: string;
  title: string;
  description: string;
  tags: string;
  content: string;
  language: string;
  url: string;
  file: UploadedFileMetadata | null;
};

const supportedTypeSlugs = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
];

export function ItemCreateDialog({
  initialTypeSlug,
  itemTypes,
  triggerClassName,
  triggerLabel = "New Item",
}: {
  initialTypeSlug?: string;
  itemTypes: DashboardItemType[];
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const availableTypes = useMemo(
    () => itemTypes.filter((type) => supportedTypeSlugs.includes(type.slug)),
    [itemTypes]
  );
  const fallbackTypeSlug = availableTypes[0]?.slug ?? "snippet";
  const defaultTypeSlug =
    initialTypeSlug && supportedTypeSlugs.includes(initialTypeSlug)
      ? initialTypeSlug
      : fallbackTypeSlug;
  const [form, setForm] = useState<CreateItemFormState>(() =>
    getInitialForm(defaultTypeSlug)
  );
  const [formError, setFormError] = useState("");
  const selectedType =
    availableTypes.find((type) => type.slug === form.typeSlug) ??
    availableTypes[0];
  const supportsContent = doesTypeSupportContent(form.typeSlug);
  const usesCodeEditor = doesTypeUseCodeEditor(form.typeSlug);
  const usesMarkdownEditor = doesTypeUseMarkdownEditor(form.typeSlug);
  const supportsLanguage = doesTypeSupportLanguage(form.typeSlug);
  const supportsUrl = doesTypeSupportUrl(form.typeSlug);
  const supportsFileUpload = doesTypeSupportFileUpload(form.typeSlug);
  const isSubmitDisabled =
    isSaving ||
    availableTypes.length === 0 ||
    form.title.trim().length === 0 ||
    (supportsUrl && form.url.trim().length === 0) ||
    (supportsFileUpload && !form.file);

  function updateForm(patch: Partial<CreateItemFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openDialog() {
    setForm(getInitialForm(defaultTypeSlug));
    setFormError("");
    setIsSaving(false);
    setIsOpen(true);
  }

  function closeDialog({ cleanupUpload = true } = {}) {
    if (cleanupUpload && form.file) {
      void cleanupPendingUpload(form.file.uploadToken);
    }

    setIsOpen(false);
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
        file: supportsFileUpload ? form.file : null,
      });
    } catch (error) {
      console.error("Failed to create item.", error);
      const message =
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Unable to create item. Try again.";
      result = { success: false, error: message };
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
          className="max-h-none max-w-xl overflow-visible"
          showCloseButton={!isSaving}
        >
          <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
            <div className="shrink-0 px-5 pb-3 pt-5">
              <DialogHeader className="pr-8">
                <DialogTitle>Create Item</DialogTitle>
                <DialogDescription className="sr-only">
                  Create a new item.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-5 pb-5">
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

                <section className="grid gap-3">
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

                  <CreateField label="Description">
                      <CreateTextarea
                        disabled={isSaving}
                        onChange={(description) => updateForm({ description })}
                        rows={2}
                        value={form.description}
                      />
                  </CreateField>

                  <CreateField label="Tags">
                    <Input
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm({ tags: event.target.value })
                      }
                      placeholder="react, terminal, workflow"
                      value={form.tags}
                    />
                  </CreateField>

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

                  {supportsLanguage && (
                    <CreateField label="Language">
                      <Input
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm({ language: event.target.value })
                        }
                        value={form.language}
                      />
                    </CreateField>
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
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
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
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
    language: "",
    url: "",
    file: null,
  };
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function doesTypeSupportContent(slug: string) {
  return ["snippet", "prompt", "command", "note"].includes(slug);
}

function doesTypeSupportLanguage(slug: string) {
  return ["snippet", "command"].includes(slug);
}

function doesTypeUseCodeEditor(slug: string) {
  return ["snippet", "command"].includes(slug);
}

function doesTypeUseMarkdownEditor(slug: string) {
  return ["prompt", "note"].includes(slug);
}

function doesTypeSupportUrl(slug: string) {
  return slug === "link";
}

function doesTypeSupportFileUpload(slug: string) {
  return ["file", "image"].includes(slug);
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
