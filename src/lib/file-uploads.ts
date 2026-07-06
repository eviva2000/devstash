export type UploadItemType = "file" | "image";

export type StoredFileMetadata = {
  fileUrl: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
};

export type UploadedFileMetadata = Omit<StoredFileMetadata, "fileUrl"> & {
  uploadToken: string;
};

type FileLike = {
  name: string;
  size: number;
  type: string;
};

const megabyte = 1024 * 1024;

export const uploadConstraints = {
  image: {
    maxSize: 5 * megabyte,
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
  },
  file: {
    maxSize: 10 * megabyte,
    extensions: [
      ".pdf",
      ".txt",
      ".md",
      ".json",
      ".yaml",
      ".yml",
      ".xml",
      ".csv",
      ".toml",
      ".ini",
    ],
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/toml",
    ],
  },
} as const;

export function isUploadItemType(value: string): value is UploadItemType {
  return value === "file" || value === "image";
}

export function validateUploadFile(file: FileLike, itemType: UploadItemType) {
  const constraints = uploadConstraints[itemType];
  const extension = getFileExtension(file.name);
  const mimeType = file.type.trim().toLowerCase();

  if (!constraints.extensions.includes(extension as never)) {
    return {
      valid: false,
      error:
        itemType === "image"
          ? "Choose a PNG, JPG, GIF, WebP, or SVG image."
          : "Choose a supported document or text file.",
    };
  }

  if (file.size > constraints.maxSize) {
    return {
      valid: false,
      error: `File must be ${formatFileSize(constraints.maxSize)} or smaller.`,
    };
  }

  if (mimeType && !constraints.mimeTypes.includes(mimeType as never)) {
    return {
      valid: false,
      error: "File type is not supported.",
    };
  }

  return { valid: true, error: null };
}

export function getAcceptedUploadTypes(itemType: UploadItemType) {
  const constraints = uploadConstraints[itemType];

  return [...constraints.extensions, ...constraints.mimeTypes].join(",");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}
