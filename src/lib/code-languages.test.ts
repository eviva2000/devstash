import { describe, expect, it } from "vitest";

import {
  getCodeLanguageLabel,
  getDefaultCodeLanguage,
  normalizeCodeLanguage,
} from "./code-languages";

describe("code language utilities", () => {
  it("normalizes empty and shorthand language values for Monaco", () => {
    expect(normalizeCodeLanguage()).toBe("plaintext");
    expect(normalizeCodeLanguage(" TSX ")).toBe("typescript");
    expect(normalizeCodeLanguage("bash")).toBe("shell");
  });

  it("provides readable labels while preserving unknown language names", () => {
    expect(getCodeLanguageLabel("typescript")).toBe("TypeScript / TSX");
    expect(getCodeLanguageLabel("custom-language")).toBe("custom-language");
  });

  it("uses shell for commands and plain text for other code items", () => {
    expect(getDefaultCodeLanguage("command")).toBe("shell");
    expect(getDefaultCodeLanguage("snippet")).toBe("plaintext");
  });
});
