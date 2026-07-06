"use client";

import { File, Image, Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatFileSize,
  getAcceptedUploadTypes,
  validateUploadFile,
  type UploadedFileMetadata,
  type UploadItemType,
} from "@/lib/file-uploads";
import { cn } from "@/lib/utils";

type UploadResponse = {
  file?: UploadedFileMetadata;
  error?: string;
};

export function FileUpload({
  disabled = false,
  itemType,
  onChange,
  value,
}: {
  disabled?: boolean;
  itemType: UploadItemType;
  onChange: (file: UploadedFileMetadata | null) => void;
  value: UploadedFileMetadata | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const Icon = itemType === "image" ? Image : File;

  function openFilePicker() {
    if (!disabled && !isUploading && !isRemoving) {
      inputRef.current?.click();
    }
  }

  function handleFile(file: globalThis.File | undefined) {
    if (!file || disabled || isUploading || isRemoving) {
      return;
    }

    const validation = validateUploadFile(file, itemType);

    if (!validation.valid) {
      setError(validation.error ?? "File is not supported.");
      return;
    }

    uploadFile(file);
  }

  function uploadFile(file: globalThis.File) {
    setError("");
    setProgress(0);
    setIsUploading(true);
    const previousUploadToken = value?.uploadToken;

    const formData = new FormData();
    formData.set("itemType", itemType);
    formData.set("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/uploads");
    request.responseType = "json";
    request.setRequestHeader("Accept", "application/json");

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      setProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      const payload = request.response as UploadResponse | null;

      setIsUploading(false);
      setProgress(0);

      if (request.status < 200 || request.status >= 300 || !payload?.file) {
        setError(payload?.error ?? "Unable to upload file. Try again.");
        return;
      }

      onChange(payload.file);

      if (previousUploadToken) {
        void cleanupUpload(previousUploadToken);
      }
    };

    request.onerror = () => {
      setIsUploading(false);
      setProgress(0);
      setError("Unable to upload file. Try again.");
    };

    request.send(formData);
  }

  async function removeUpload() {
    if (!value || disabled || isUploading || isRemoving) {
      return;
    }

    setError("");
    setIsRemoving(true);

    try {
      await cleanupUpload(value.uploadToken);
      onChange(null);
    } catch (removeError) {
      console.error("Failed to remove upload.", removeError);
      setError("Unable to remove upload. Try again.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        accept={getAcceptedUploadTypes(itemType)}
        className="sr-only"
        disabled={disabled || isUploading || isRemoving}
        onChange={(event) => handleFile(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      <button
        className={cn(
          "flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-4 py-5 text-center text-card-foreground transition-colors",
          dragActive && "border-primary bg-primary/5",
          (disabled || isUploading || isRemoving) && "cursor-not-allowed opacity-60"
        )}
        disabled={disabled || isUploading || isRemoving}
        onClick={openFilePicker}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        type="button"
      >
        <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isRemoving ? (
            <Loader2 className="size-5 animate-spin" />
          ) : value ? (
            <Icon className="size-5" />
          ) : (
            <UploadCloud className="size-5" />
          )}
        </span>

        <span className="space-y-1">
          <span className="block text-sm font-medium">
            {value?.fileName ?? (itemType === "image" ? "Upload image" : "Upload file")}
          </span>
          <span className="block text-xs text-muted-foreground">
            {value
              ? `${value.fileMimeType} · ${formatFileSize(value.fileSize)}`
              : itemType === "image"
                ? "PNG, JPG, GIF, WebP, or SVG up to 5 MB"
                : "PDF, text, Markdown, JSON, YAML, XML, CSV, TOML, or INI up to 10 MB"}
          </span>
        </span>

        {isUploading && (
          <span className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </span>
        )}
      </button>

      {value && !isUploading && (
        <Button
          disabled={disabled || isRemoving}
          onClick={() => void removeUpload()}
          size="sm"
          type="button"
          variant="outline"
        >
          {isRemoving ? <Loader2 className="animate-spin" /> : <X />}
          {isRemoving ? "Removing" : "Remove upload"}
        </Button>
      )}

      {error && (
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

async function cleanupUpload(uploadToken: string) {
  const response = await fetch("/api/uploads", {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uploadToken }),
  });

  if (!response.ok) {
    throw new Error("Unable to remove upload.");
  }
}
