import { describe, expect, test } from "vitest";

import { cuidSchema, getFirstZodError, isCuid } from "./validation";

describe("CUID2 validation", () => {
  test("accepts Prisma-style CUID2 values and existing CUID v1 values", () => {
    const value = "tz4a98xxat96iws9zmbrgj3a";
    const legacyValue = "c12345678901234567890123";

    expect(cuidSchema().safeParse(value).success).toBe(true);
    expect(isCuid(value)).toBe(true);
    expect(cuidSchema().safeParse(legacyValue).success).toBe(true);
    expect(isCuid(legacyValue)).toBe(true);
  });

  test("rejects non-CUID values with a contextual message", () => {
    const parsed = cuidSchema("Choose a valid item.").safeParse("invalid-id");

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(getFirstZodError(parsed.error, "Fallback")).toBe(
      "Choose a valid item."
    );
    expect(isCuid("invalid-id")).toBe(false);
  });
});
