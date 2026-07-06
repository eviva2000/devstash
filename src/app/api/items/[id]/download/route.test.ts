import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import { getItemDetailById } from "@/lib/db/items";
import { getR2Object } from "@/lib/storage/r2";

import { GET } from "./route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/items", () => ({
  getItemDetailById: vi.fn(),
}));

vi.mock("@/lib/storage/r2", () => ({
  getR2Object: vi.fn(),
}));

type AuthSession = Session | null;

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<AuthSession>>;
const getItemDetailByIdMock = vi.mocked(getItemDetailById);
const getR2ObjectMock = vi.mocked(getR2Object);

describe("GET /api/items/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated downloads", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(downloadRequest(), routeContext("item-1"));

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
    expect(getItemDetailByIdMock).not.toHaveBeenCalled();
  });

  test("returns 404 when the item has no file metadata", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue({
      ...itemDetail(),
      fileUrl: null,
      fileName: null,
    });

    const response = await GET(downloadRequest(), routeContext("item-1"));

    await expect(response.json()).resolves.toEqual({ error: "File not found." });
    expect(response.status).toBe(404);
    expect(getR2ObjectMock).not.toHaveBeenCalled();
  });

  test("streams an R2 object as an attachment", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue(itemDetail());
    getR2ObjectMock.mockResolvedValue(r2Object("download content"));

    const response = await GET(downloadRequest(), routeContext("item-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Length")).toBe("16");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="upload.pdf"'
    );
    await expect(response.text()).resolves.toBe("download content");
    expect(getR2ObjectMock).toHaveBeenCalledWith("users/user-1/upload.pdf");
  });

  test("uses inline disposition for image previews", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    getItemDetailByIdMock.mockResolvedValue({
      ...itemDetail(),
      fileName: 'screen"shot.png',
      fileMimeType: "image/png",
      fileSize: 7,
      fileUrl: "users/user-1/upload.png",
    });
    getR2ObjectMock.mockResolvedValue(r2Object("preview", "image/png"));

    const response = await GET(
      new Request("http://localhost/api/items/item-1/download?preview=1"),
      routeContext("item-1")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="screen_shot.png"'
    );
    await expect(response.text()).resolves.toBe("preview");
  });
});

function downloadRequest() {
  return new Request("http://localhost/api/items/item-1/download");
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

type R2Object = Awaited<ReturnType<typeof getR2Object>>;

function r2Object(content: string, contentType = "application/pdf"): R2Object {
  return {
    $metadata: {},
    ContentType: contentType,
    Body: {
      transformToWebStream: () =>
        new Response(content).body as ReadableStream<Uint8Array>,
    },
  } as R2Object;
}

function itemDetail() {
  const createdAt = new Date("2026-07-06T10:00:00.000Z");
  const updatedAt = new Date("2026-07-06T10:15:00.000Z");

  return {
    id: "item-1",
    title: "Upload",
    description: "",
    typeId: "type-file",
    collectionId: null,
    collection: null,
    content: null,
    language: null,
    url: null,
    isFavorite: false,
    isPinned: false,
    tags: [],
    createdAt,
    updatedAt,
    contentType: "FILE",
    fileUrl: "users/user-1/upload.pdf",
    fileName: "upload.pdf",
    fileMimeType: "application/pdf",
    fileSize: 16,
    lastUsedAt: null,
    type: {
      id: "type-file",
      name: "File",
      slug: "file",
      icon: "File",
      color: "#6b7280",
      isSystem: true,
    },
  };
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
