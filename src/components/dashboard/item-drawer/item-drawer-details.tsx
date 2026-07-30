"use client";

import { Download } from "lucide-react";
import NextImage from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { explainCode } from "@/actions/ai";
import { CodeEditor } from "@/components/dashboard/code-editor";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
import { buttonVariants } from "@/components/ui/button";
import type {
  DashboardCollection,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";
import { formatFileSize } from "@/lib/file-uploads";

import { DrawerMeta } from "./item-drawer-fields";
import {
  formatApiDate,
  getDownloadUrl,
  isImageItem,
} from "./item-drawer-utils";
import type { ItemDetail } from "./types";

export function ItemDrawerDetails({
  collection,
  item,
  type,
  usesCodeEditor,
  usesMarkdownEditor,
  isPro,
}: Readonly<{
  collection: DashboardCollection | null;
  item: ItemDetail;
  type?: DashboardItemType;
  usesCodeEditor: boolean;
  usesMarkdownEditor: boolean;
  isPro: boolean;
}>) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  async function handleExplain() {
    if (!isPro) { toast.error("AI features require Pro subscription"); return; }
    setIsExplaining(true);
    try {
      const result = await explainCode({ itemId: item.id });
      if (!result.success) { toast.error(result.error); return; }
      setExplanation(result.data);
    } catch { toast.error("AI code explanation is temporarily unavailable. Try again."); }
    finally { setIsExplaining(false); }
  }
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

      {(item.fileName || item.fileUrl) && <FileSection item={item} />}

      {item.content && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Content</h3>
          <ContentView
            content={item.content}
            language={item.language}
            usesCodeEditor={usesCodeEditor}
            usesMarkdownEditor={usesMarkdownEditor}
            explanation={explanation}
            isExplaining={isExplaining}
            isPro={isPro}
            onExplain={usesCodeEditor ? handleExplain : undefined}
          />
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

function FileSection({ item }: Readonly<{ item: ItemDetail }>) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">File</h3>
      <div className="space-y-3 rounded-md border border-border bg-card p-3 text-sm">
        {isImageItem(item) && item.fileUrl && (
          <div className="relative h-72 overflow-hidden rounded-md border border-border bg-background">
            <NextImage
              alt={item.fileName ?? item.title}
              className="object-contain"
              fill
              sizes="(max-width: 640px) 100vw, 456px"
              src={`${getDownloadUrl(item)}?preview=1`}
              unoptimized
            />
          </div>
        )}
        <p className="font-medium">{item.fileName ?? "Attached file"}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {item.fileMimeType && <span>{item.fileMimeType}</span>}
          {item.fileSize ? <span>{formatFileSize(item.fileSize)}</span> : null}
        </div>
        {item.fileUrl && (
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={getDownloadUrl(item)}
          >
            <Download />
            Download
          </a>
        )}
      </div>
    </section>
  );
}

function ContentView({
  content,
  language,
  usesCodeEditor,
  usesMarkdownEditor,
  explanation,
  isExplaining,
  isPro,
  onExplain,
}: Readonly<{
  content: string;
  language?: string | null;
  usesCodeEditor: boolean;
  usesMarkdownEditor: boolean;
  explanation: string | null;
  isExplaining: boolean;
  isPro: boolean;
  onExplain?: () => void;
}>) {
  if (usesCodeEditor) {
    return (
      <CodeEditor
        ariaLabel="Content"
        language={language}
        readOnly
        explanation={explanation}
        isExplaining={isExplaining}
        isPro={isPro}
        onExplain={onExplain}
        value={content}
      />
    );
  }

  if (usesMarkdownEditor) {
    return <MarkdownEditor ariaLabel="Content" readOnly value={content} />;
  }

  return (
    <pre className="max-h-[360px] overflow-auto rounded-md border border-border bg-card p-4 text-sm leading-6 text-card-foreground">
      <code>{content}</code>
    </pre>
  );
}
