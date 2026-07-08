import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import { createCollection as createCollectionRecord } from "@/lib/db/collections";
import { revalidatePath } from "next/cache";

import { createCollection } from "./collections";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/collections", () => ({
  createCollection: vi.fn(),
}));

type AuthSession = Session | null;

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<AuthSession>>;
const createCollectionRecordMock = vi.mocked(createCollectionRecord);
const revalidatePathMock = vi.mocked(revalidatePath);

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated creates", async () => {
    authMock.mockResolvedValue(null);

    await expect(createCollection(validCreateInput())).resolves.toEqual({
      success: false,
      error: "You must be signed in to create collections.",
    });
    expect(createCollectionRecordMock).not.toHaveBeenCalled();
  });

  test("returns the first validation error without creating a collection", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(
      createCollection({
        ...validCreateInput(),
        name: "   ",
      })
    ).resolves.toEqual({
      success: false,
      error: "Name is required.",
    });
    expect(createCollectionRecordMock).not.toHaveBeenCalled();
  });

  test("passes normalized create data to the database helper", async () => {
    const createdCollection = collection();
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createCollectionRecordMock.mockResolvedValue(createdCollection);

    await expect(
      createCollection({
        name: "  API Notes  ",
        description: "  Useful API references  ",
      })
    ).resolves.toEqual({ success: true, data: createdCollection });
    expect(createCollectionRecordMock).toHaveBeenCalledWith("user-1", {
      name: "API Notes",
      description: "Useful API references",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/items/[type]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  test("normalizes blank descriptions to null", async () => {
    const createdCollection = collection();
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createCollectionRecordMock.mockResolvedValue(createdCollection);

    await createCollection({
      name: "API Notes",
      description: "   ",
    });

    expect(createCollectionRecordMock).toHaveBeenCalledWith("user-1", {
      name: "API Notes",
      description: null,
    });
  });

  test("returns a generic error when create fails unexpectedly", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValue(sessionForUser("user-1"));
    createCollectionRecordMock.mockRejectedValue(new Error("database unavailable"));

    await expect(createCollection(validCreateInput())).resolves.toEqual({
      success: false,
      error: "Unable to create collection. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to create collection.",
      expect.any(Error)
    );
  });
});

function validCreateInput() {
  return {
    name: "API Notes",
    description: "Useful API references",
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
    expires: "2026-07-08T12:00:00.000Z",
  };
}

function collection(
  overrides: Partial<DashboardCollection> = {}
): DashboardCollection {
  return {
    id: "collection-1",
    name: "API Notes",
    slug: "api-notes",
    description: "Useful API references",
    isFavorite: false,
    itemCount: 0,
    ...overrides,
  };
}
