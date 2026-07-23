import { describe, expect, test } from "vitest";

import {
  filterGlobalSearchResult,
  GLOBAL_SEARCH_SCORE_THRESHOLD,
} from "./global-search-filter";

describe("filterGlobalSearchResult", () => {
  test("keeps strong fuzzy matches", () => {
    const score = filterGlobalSearchResult("item-1", "test", [
      "Testing checklist",
      "Prompt",
      "prompt",
      "Review tests and edge cases before release",
    ]);

    expect(score).toBeGreaterThanOrEqual(GLOBAL_SEARCH_SCORE_THRESHOLD);
  });

  test("rejects weak subsequence matches", () => {
    expect(
      filterGlobalSearchResult("item-1", "test", [
        "React hook",
        "Snippet",
        "snippet",
        "A reusable function for application state management",
      ])
    ).toBe(0);
  });

  test("does not search opaque result identifiers", () => {
    expect(
      filterGlobalSearchResult("item-test-exact-match", "test", [
        "Unrelated entry",
      ])
    ).toBe(0);
  });

  test("scores fields independently instead of matching across boundaries", () => {
    expect(filterGlobalSearchResult("item-1", "test", ["te", "st"])).toBe(0);
  });

  test("shows all results for an empty query", () => {
    expect(filterGlobalSearchResult("item-1", "   ", [])).toBe(1);
  });
});
