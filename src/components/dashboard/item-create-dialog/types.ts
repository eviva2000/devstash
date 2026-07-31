import type { UploadedFileMetadata } from "@/lib/file-uploads";

export type CreateItemFormState = {
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
