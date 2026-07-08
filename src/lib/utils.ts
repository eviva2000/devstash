import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Split a comma-separated tag string into a trimmed, non-empty list. */
export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/**
 * Resolve a user-facing message for a failed action, surfacing the real error
 * message only in development.
 */
export function getActionErrorMessage(error: unknown, fallback: string): string {
  return process.env.NODE_ENV === "development" && error instanceof Error
    ? error.message
    : fallback
}
