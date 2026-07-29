import { describe, expect, test } from "vitest";

import { isProOnlyItemType } from "./item-type-capabilities";

describe("isProOnlyItemType", () => {
  test.each(["file", "image"])("treats %s as a Pro-only item type", (slug) => {
    expect(isProOnlyItemType(slug)).toBe(true);
  });

  test.each(["snippet", "prompt", "command", "note", "link", "", undefined])(
    "keeps %s available outside Pro-only item routes",
    (slug) => {
      expect(isProOnlyItemType(slug)).toBe(false);
    }
  );
});
