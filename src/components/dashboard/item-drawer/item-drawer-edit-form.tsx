"use client";

import type React from "react";

import { AutoTagField } from "@/components/dashboard/auto-tag-field";
import { CodeEditor } from "@/components/dashboard/code-editor";
import { CodeLanguageSelect } from "@/components/dashboard/code-language-select";
import { CollectionSelector } from "@/components/dashboard/collection-selector";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
import { Input } from "@/components/ui/input";
import type {
  DashboardCollection,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";

import {
  DrawerMeta,
  EditField,
  EditFieldBlock,
  EditTextarea,
} from "./item-drawer-fields";
import { formatApiDate } from "./item-drawer-utils";
import type { EditFormState, ItemDetail } from "./types";

export function ItemDrawerEditForm({
  collection,
  collections,
  error,
  form,
  item,
  isPro,
  isSaving,
  onChange,
  supportsContent,
  supportsLanguage,
  supportsUrl,
  type,
  usesCodeEditor,
  usesMarkdownEditor,
}: Readonly<{
  collection: DashboardCollection | null;
  collections: DashboardCollection[];
  error: string;
  form: EditFormState;
  item: ItemDetail;
  isPro: boolean;
  isSaving: boolean;
  onChange: React.Dispatch<React.SetStateAction<EditFormState>>;
  supportsContent: boolean;
  supportsLanguage: boolean;
  supportsUrl: boolean;
  type?: DashboardItemType;
  usesCodeEditor: boolean;
  usesMarkdownEditor: boolean;
}>) {
  const setContent = (content: string) =>
    onChange((current) => ({ ...current, content }));

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

        <AutoTagField
          content={form.content}
          disabled={isSaving}
          isPro={isPro}
          onChange={(tags) =>
            onChange((current) => ({ ...current, tags }))
          }
          tags={form.tags}
          title={form.title}
        />

        <CollectionSelector
          collections={collections}
          disabled={isSaving}
          onChange={(collectionIds) =>
            onChange((current) => ({ ...current, collectionIds }))
          }
          selectedIds={form.collectionIds}
        />

        {supportsLanguage && (
          <EditFieldBlock label="Language">
            <CodeLanguageSelect
              alignItemWithTrigger={false}
              disabled={isSaving}
              onChange={(language) =>
                onChange((current) => ({ ...current, language }))
              }
              value={form.language}
            />
          </EditFieldBlock>
        )}

        {supportsContent && (
          <ContentField
            isSaving={isSaving}
            language={form.language}
            onChange={setContent}
            usesCodeEditor={usesCodeEditor}
            usesMarkdownEditor={usesMarkdownEditor}
            value={form.content}
          />
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

function ContentField({
  isSaving,
  language,
  onChange,
  usesCodeEditor,
  usesMarkdownEditor,
  value,
}: Readonly<{
  isSaving: boolean;
  language: string;
  onChange: (value: string) => void;
  usesCodeEditor: boolean;
  usesMarkdownEditor: boolean;
  value: string;
}>) {
  if (usesCodeEditor) {
    return (
      <EditFieldBlock label="Content">
        <CodeEditor
          ariaLabel="Content"
          disabled={isSaving}
          language={language}
          minHeight={300}
          onChange={onChange}
          value={value}
        />
      </EditFieldBlock>
    );
  }

  if (usesMarkdownEditor) {
    return (
      <EditFieldBlock label="Content">
        <MarkdownEditor
          ariaLabel="Content"
          disabled={isSaving}
          minHeight={300}
          onChange={onChange}
          value={value}
        />
      </EditFieldBlock>
    );
  }

  return (
    <EditField label="Content">
      <EditTextarea
        disabled={isSaving}
        onChange={onChange}
        rows={9}
        value={value}
      />
    </EditField>
  );
}
