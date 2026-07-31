import { z, type ZodError } from "zod";

const defaultCuidSchema = z.cuid2();

export function cuidSchema(error?: string) {
  return error ? z.cuid2({ error }) : defaultCuidSchema;
}

export function isCuid(value: unknown): value is string {
  return defaultCuidSchema.safeParse(value).success;
}

export function getFirstZodError(
  error: ZodError,
  fallback: string
): string {
  return error.issues[0]?.message ?? fallback;
}
