import { FileText } from "lucide-react";

import { AutoTagField } from "@/components/dashboard/auto-tag-field";
import { CodeEditor } from "@/components/dashboard/code-editor";
import { CodeLanguageSelect } from "@/components/dashboard/code-language-select";
import { CollectionSelector } from "@/components/dashboard/collection-selector";
import { FileUpload } from "@/components/dashboard/file-upload";
import { GenerateDescriptionButton } from "@/components/dashboard/generate-description-button";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
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
import {
  doesTypeSupportContent,
  doesTypeSupportFile,
  doesTypeSupportLanguage,
  doesTypeSupportUrl,
  doesTypeUseCodeEditor,
  doesTypeUseMarkdownEditor,
} from "@/lib/item-type-capabilities";
import { cn } from "@/lib/utils";

import {
  CreateField,
  CreateFieldBlock,
  CreateTextarea,
  FieldLabel,
} from "./item-create-dialog-fields";
import type { CreateItemFormState } from "./types";

export function ItemCreateFormFields({
  availableTypes,
  collections,
  form,
  isPro,
  isSaving,
  isUploadBlocked,
  onFileChange,
  onTypeChange,
  onUpdate,
}: {
  availableTypes: DashboardItemType[];
  collections: DashboardCollection[];
  form: CreateItemFormState;
  isPro: boolean;
  isSaving: boolean;
  isUploadBlocked: boolean;
  onFileChange: (file: UploadedFileMetadata | null) => void;
  onTypeChange: (typeSlug: string) => void;
  onUpdate: (patch: Partial<CreateItemFormState>) => void;
}) {
  const selectedType =
    availableTypes.find((type) => type.slug === form.typeSlug) ??
    availableTypes[0];
  const supportsContent = doesTypeSupportContent(form.typeSlug);
  const supportsLanguage = doesTypeSupportLanguage(form.typeSlug);
  const supportsUrl = doesTypeSupportUrl(form.typeSlug);
  const supportsFileUpload = doesTypeSupportFile(form.typeSlug);

  return (
    <>
      <section className="space-y-2">
        <FieldLabel>Type</FieldLabel>
        <Select
          disabled={isSaving || availableTypes.length === 0}
          onValueChange={(value) => {
            if (value) {
              onTypeChange(value);
            }
          }}
          value={form.typeSlug}
        >
          <SelectTrigger aria-label="Item type">
            <span className="flex min-w-0 items-center gap-2">
              {selectedType && <TypeIconBadge size="sm" type={selectedType} />}
              <SelectValue placeholder="Choose item type">
                {(value) =>
                  availableTypes.find((type) => type.slug === value)?.name ??
                  "Choose item type"
                }
              </SelectValue>
            </span>
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((type) => (
              <SelectItem key={type.id} label={type.name} value={type.slug}>
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
            onChange={(event) => onUpdate({ title: event.target.value })}
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
              onGenerated={(description) => onUpdate({ description })}
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
            onChange={(description) => onUpdate({ description })}
            rows={2}
            value={form.description}
          />
        </CreateFieldBlock>

        <AutoTagField
          content={form.content}
          disabled={isSaving}
          isPro={isPro}
          onChange={(tags) => onUpdate({ tags })}
          tags={form.tags}
          title={form.title}
        />

        <CollectionSelector
          collections={collections}
          disabled={isSaving}
          onChange={(collectionIds) => onUpdate({ collectionIds })}
          selectedIds={form.collectionIds}
        />

        {supportsLanguage && (
          <CreateFieldBlock label="Language">
            <CodeLanguageSelect
              disabled={isSaving}
              onChange={(language) => onUpdate({ language })}
              value={form.language}
            />
          </CreateFieldBlock>
        )}

        {supportsContent && (
          <ContentField form={form} isSaving={isSaving} onUpdate={onUpdate} />
        )}

        {supportsUrl && (
          <CreateField label="URL" required>
            <Input
              disabled={isSaving}
              onChange={(event) => onUpdate({ url: event.target.value })}
              required
              type="url"
              value={form.url}
            />
          </CreateField>
        )}

        {supportsFileUpload && (
          <CreateFieldBlock label="Upload" required>
            <FileUpload
              disabled={isSaving || isUploadBlocked}
              itemType={form.typeSlug as UploadItemType}
              onChange={onFileChange}
              value={form.file}
            />
          </CreateFieldBlock>
        )}
      </section>
    </>
  );
}

function ContentField({
  form,
  isSaving,
  onUpdate,
}: {
  form: CreateItemFormState;
  isSaving: boolean;
  onUpdate: (patch: Partial<CreateItemFormState>) => void;
}) {
  if (doesTypeUseCodeEditor(form.typeSlug)) {
    return (
      <CreateFieldBlock label="Content">
        <CodeEditor
          ariaLabel="Content"
          disabled={isSaving}
          language={form.language}
          minHeight={260}
          onChange={(content) => onUpdate({ content })}
          value={form.content}
        />
      </CreateFieldBlock>
    );
  }

  if (doesTypeUseMarkdownEditor(form.typeSlug)) {
    return (
      <CreateFieldBlock label="Content">
        <MarkdownEditor
          ariaLabel="Content"
          disabled={isSaving}
          minHeight={260}
          onChange={(content) => onUpdate({ content })}
          value={form.content}
        />
      </CreateFieldBlock>
    );
  }

  return (
    <CreateField label="Content">
      <CreateTextarea
        disabled={isSaving}
        onChange={(content) => onUpdate({ content })}
        rows={5}
        value={form.content}
      />
    </CreateField>
  );
}

function TypeIconBadge({
  size = "default",
  type,
}: {
  size?: "default" | "sm";
  type: DashboardItemType;
}) {
  const Icon =
    typeIconMap[type.icon as keyof typeof typeIconMap] ??
    typeIconMap[type.slug as keyof typeof typeIconMap] ??
    FileText;

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
      <Icon className="size-4" />
    </span>
  );
}
