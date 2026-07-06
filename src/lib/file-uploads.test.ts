import { describe, expect, test } from "vitest";

import {
  formatFileSize,
  getAcceptedUploadTypes,
  isUploadItemType,
  validateUploadFile,
} from "./file-uploads";

describe("validateUploadFile", () => {
  test("accepts valid image uploads", () => {
    expect(
      validateUploadFile(
        { name: "screenshot.PNG", size: 1024, type: "image/png" },
        "image"
      )
    ).toEqual({ valid: true, error: null });
  });

  test("rejects images with unsupported extensions", () => {
    expect(
      validateUploadFile(
        { name: "screenshot.bmp", size: 1024, type: "image/bmp" },
        "image"
      )
    ).toEqual({
      valid: false,
      error: "Choose a PNG, JPG, GIF, WebP, or SVG image.",
    });
  });

  test("rejects uploads larger than the type limit", () => {
    expect(
      validateUploadFile(
        { name: "large.png", size: 5 * 1024 * 1024 + 1, type: "image/png" },
        "image"
      )
    ).toEqual({
      valid: false,
      error: "File must be 5.0 MB or smaller.",
    });
  });

  test("rejects mismatched MIME types even when the extension is allowed", () => {
    expect(
      validateUploadFile(
        { name: "document.pdf", size: 1024, type: "application/x-msdownload" },
        "file"
      )
    ).toEqual({
      valid: false,
      error: "File type is not supported.",
    });
  });

  test("accepts allowed file uploads with empty browser MIME types", () => {
    expect(
      validateUploadFile(
        { name: "config.toml", size: 1024, type: "" },
        "file"
      )
    ).toEqual({ valid: true, error: null });
  });
});

describe("upload helpers", () => {
  test("identifies upload item types", () => {
    expect(isUploadItemType("file")).toBe(true);
    expect(isUploadItemType("image")).toBe(true);
    expect(isUploadItemType("snippet")).toBe(false);
  });

  test("builds accept strings from allowed extensions and MIME types", () => {
    const accept = getAcceptedUploadTypes("image");

    expect(accept).toContain(".png");
    expect(accept).toContain(".svg");
    expect(accept).toContain("image/webp");
  });

  test("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
