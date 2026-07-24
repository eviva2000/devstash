/**
 * Single source of truth for what each item type supports. These rules are
 * shared by server code (item creation/updates) and client editors so the
 * behaviour cannot drift between them.
 */

export const CREATABLE_ITEM_TYPE_SLUGS = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
  "file",
  "image",
] as const;

export const PRO_ONLY_ITEM_TYPE_SLUGS = ["file", "image"] as const;

export type ProOnlyItemTypeSlug = (typeof PRO_ONLY_ITEM_TYPE_SLUGS)[number];

export function isCreatableItemType(slug?: string): boolean {
  return slug
    ? (CREATABLE_ITEM_TYPE_SLUGS as readonly string[]).includes(slug)
    : false;
}

export function isProOnlyItemType(
  slug?: string
): slug is ProOnlyItemTypeSlug {
  return slug
    ? (PRO_ONLY_ITEM_TYPE_SLUGS as readonly string[]).includes(slug)
    : false;
}

export function doesTypeSupportContent(slug?: string): boolean {
  return slug ? ["snippet", "prompt", "command", "note"].includes(slug) : false;
}

export function doesTypeSupportLanguage(slug?: string): boolean {
  return slug ? ["snippet", "command"].includes(slug) : false;
}

export function doesTypeUseCodeEditor(slug?: string): boolean {
  return slug ? ["snippet", "command"].includes(slug) : false;
}

export function doesTypeUseMarkdownEditor(slug?: string): boolean {
  return slug ? ["prompt", "note"].includes(slug) : false;
}

export function doesTypeSupportUrl(slug?: string): boolean {
  return slug === "link";
}

export function doesTypeSupportFile(slug?: string): boolean {
  return isProOnlyItemType(slug);
}
