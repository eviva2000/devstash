import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import {
  createPendingItemUpload,
  deletePendingItemUpload,
  getPendingItemUpload,
} from "@/lib/db/items";
import { createR2ObjectKey, deleteR2Object, uploadR2Object } from "@/lib/storage/r2";

import { DELETE, POST } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/items", () => ({
  createPendingItemUpload: vi.fn(),
  deletePendingItemUpload: vi.fn(),
  getPendingItemUpload: vi.fn(),
}));

vi.mock("@/lib/storage/r2", () => ({
  createR2ObjectKey: vi.fn(),
  deleteR2Object: vi.fn(),
  uploadR2Object: vi.fn(),
}));

type AuthSession = Session | null;

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<AuthSession>>;
const createPendingItemUploadMock = vi.mocked(createPendingItemUpload);
const createR2ObjectKeyMock = vi.mocked(createR2ObjectKey);
const deletePendingItemUploadMock = vi.mocked(deletePendingItemUpload);
const deleteR2ObjectMock = vi.mocked(deleteR2Object);
const getPendingItemUploadMock = vi.mocked(getPendingItemUpload);
const uploadR2ObjectMock = vi.mocked(uploadR2Object);

describe("POST /api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createR2ObjectKeyMock.mockReturnValue("users/user-1/upload.png");
  });

  test("rejects unauthenticated upload attempts", async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(uploadRequest("image", imageFile()));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
    expect(uploadR2ObjectMock).not.toHaveBeenCalled();
  });

  test("rejects invalid item types before uploading", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    const response = await POST(uploadRequest("snippet", imageFile()));

    await expect(response.json()).resolves.toEqual({
      error: "Choose a valid upload type.",
    });
    expect(response.status).toBe(400);
    expect(uploadR2ObjectMock).not.toHaveBeenCalled();
  });

  test("rejects invalid files before uploading", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    const response = await POST(
      uploadRequest("image", new File(["bad"], "upload.bmp", { type: "image/bmp" }))
    );

    await expect(response.json()).resolves.toEqual({
      error: "Choose a PNG, JPG, GIF, WebP, or SVG image.",
    });
    expect(response.status).toBe(400);
    expect(uploadR2ObjectMock).not.toHaveBeenCalled();
  });

  test("uploads to R2, creates a pending record, and returns token metadata", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createPendingItemUploadMock.mockResolvedValue({
      uploadToken: "cm11111111111111111111111",
      fileName: "upload.png",
      fileMimeType: "image/png",
      fileSize: 7,
    });

    const response = await POST(uploadRequest("image", imageFile()));

    await expect(response.json()).resolves.toEqual({
      file: {
        uploadToken: "cm11111111111111111111111",
        fileName: "upload.png",
        fileMimeType: "image/png",
        fileSize: 7,
      },
    });
    expect(response.status).toBe(200);
    expect(uploadR2ObjectMock).toHaveBeenCalledWith({
      key: "users/user-1/upload.png",
      body: Buffer.from("content"),
      contentType: "image/png",
    });
    expect(createPendingItemUploadMock).toHaveBeenCalledWith("user-1", "image", {
      fileUrl: "users/user-1/upload.png",
      fileName: "upload.png",
      fileMimeType: "image/png",
      fileSize: 7,
    });
  });

  test("cleans up the R2 object if pending record creation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createPendingItemUploadMock.mockRejectedValue(new Error("database failed"));

    const response = await POST(uploadRequest("image", imageFile()));

    await expect(response.json()).resolves.toEqual({
      error: "Unable to upload file. Try again.",
    });
    expect(response.status).toBe(500);
    expect(deleteR2ObjectMock).toHaveBeenCalledWith("users/user-1/upload.png");
    consoleError.mockRestore();
  });
});

describe("DELETE /api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("treats a missing pending upload as already cleaned up", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getPendingItemUploadMock.mockResolvedValue(null);

    const response = await DELETE(deleteRequest("cm11111111111111111111111"));

    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.status).toBe(200);
    expect(deleteR2ObjectMock).not.toHaveBeenCalled();
    expect(deletePendingItemUploadMock).not.toHaveBeenCalled();
  });

  test("deletes the R2 object and pending upload record", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getPendingItemUploadMock.mockResolvedValue({
      fileUrl: "users/user-1/upload.png",
      fileName: "upload.png",
      fileMimeType: "image/png",
      fileSize: 7,
    });
    deletePendingItemUploadMock.mockResolvedValue({
      fileUrl: "users/user-1/upload.png",
      fileName: "upload.png",
      fileMimeType: "image/png",
      fileSize: 7,
    });

    const response = await DELETE(deleteRequest("cm11111111111111111111111"));

    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.status).toBe(200);
    expect(deleteR2ObjectMock).toHaveBeenCalledWith("users/user-1/upload.png");
    expect(deletePendingItemUploadMock).toHaveBeenCalledWith(
      "user-1",
      "cm11111111111111111111111"
    );
  });
});

function uploadRequest(itemType: string, file: File) {
  const formData = new FormData();
  formData.set("itemType", itemType);
  formData.set("file", file);

  return new Request("http://localhost/api/uploads", {
    method: "POST",
    body: formData,
  });
}

function deleteRequest(uploadToken: string) {
  return new Request("http://localhost/api/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadToken }),
  });
}

function imageFile() {
  return new File(["content"], "upload.png", { type: "image/png" });
}

function sessionForUser(userId: string): Session {
  return {
    user: {
      id: userId,
      name: "Demo User",
      email: "demo@devstash.io",
      image: null,
    },
    expires: "2026-07-06T12:00:00.000Z",
  };
}
