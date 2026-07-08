import type { KeyboardEvent, MouseEvent } from "react";
import {
  Download,
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Pin,
  Presentation,
  Star,
} from "lucide-react";

import type { DashboardItem } from "@/features/dashboard/dashboard-types";
import { formatDate } from "@/features/dashboard/dashboard-utils";

export function FileListRow({
  item,
  onOpen,
}: {
  item: DashboardItem;
  onOpen: () => void;
}) {
  const fileName = item.fileName ?? item.title;
  const extension = getFileExtension(fileName);
  const downloadUrl = item.fileUrl
    ? `/api/items/${encodeURIComponent(item.id)}/download`
    : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  const stopDownloadPropagation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      aria-label={`Open file details for ${item.title}`}
      className="grid cursor-pointer grid-cols-1 gap-3 bg-card px-4 py-3 text-left text-card-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:grid-cols-[minmax(0,1fr)_140px_132px_auto] md:items-center"
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileTypeIcon extension={extension} mimeType={item.fileMimeType} />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium">{fileName}</p>
            {item.isPinned && <Pin className="size-3.5 shrink-0" />}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          {item.description && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground md:block">
        <span className="md:hidden">Size</span>
        <span>{formatFileSize(item.fileSize)}</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground md:block">
        <span className="md:hidden">Uploaded</span>
        <time dateTime={item.createdAt.toISOString()}>
          {formatDate(item.createdAt)}
        </time>
      </div>

      <div className="flex justify-start md:justify-end">
        {downloadUrl ? (
          <a
            aria-label={`Download ${fileName}`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href={downloadUrl}
            onClick={stopDownloadPropagation}
          >
            <Download className="size-4" />
            Download
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Unavailable</span>
        )}
      </div>
    </div>
  );
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.slice(dotIndex + 1).toLowerCase();
}

function FileTypeIcon({
  extension,
  mimeType,
}: {
  extension: string;
  mimeType?: string | null;
}) {
  if (mimeType?.startsWith("image/")) {
    return <FileImage className="size-5" />;
  }

  if (mimeType?.startsWith("audio/")) {
    return <FileAudio className="size-5" />;
  }

  if (mimeType?.startsWith("video/")) {
    return <FileVideo className="size-5" />;
  }

  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return <FileArchive className="size-5" />;
  }

  if (["csv", "xls", "xlsx", "ods"].includes(extension)) {
    return <FileSpreadsheet className="size-5" />;
  }

  if (["ppt", "pptx", "key"].includes(extension)) {
    return <Presentation className="size-5" />;
  }

  if (
    ["js", "jsx", "ts", "tsx", "html", "css", "py", "rb"].includes(extension)
  ) {
    return <FileCode2 className="size-5" />;
  }

  if (extension === "json") {
    return <FileJson className="size-5" />;
  }

  if (["md", "pdf", "txt", "doc", "docx"].includes(extension)) {
    return <FileText className="size-5" />;
  }

  return <File className="size-5" />;
}

function formatFileSize(bytes?: number | null) {
  if (bytes == null) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
