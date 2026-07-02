import { describe, expect, test } from "vitest";

import { validateQueryLimit } from "./query-limits";

describe("validateQueryLimit", () => {
  test("returns a valid integer limit", () => {
    expect(validateQueryLimit(6, { max: 10, name: "limit" })).toBe(6);
  });

  test("rejects non-integer and out-of-range limits", () => {
    expect(() => validateQueryLimit(0, { max: 10, name: "limit" })).toThrow(
      "limit must be an integer between 1 and 10."
    );
    expect(() => validateQueryLimit(11, { max: 10, name: "limit" })).toThrow(
      RangeError
    );
    expect(() =>
      validateQueryLimit(1.5, { max: 10, name: "limit" })
    ).toThrow(RangeError);
  });
});
