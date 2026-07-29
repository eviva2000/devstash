import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import {
  createCollection as createCollectionRecord,
  deleteCollection as deleteCollectionRecord,
  updateCollection as updateCollectionRecord,
} from "@/lib/db/collections";
import { revalidatePath } from "next/cache";

import {
  createCollection,
  deleteCollection,
  updateCollection,
} from "./collections";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db/collections", () => ({
  createCollection: vi.fn(),
  deleteCollection: vi.fn(),
  isCreateCollectionFailure: (value: unknown) =>
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false,
  updateCollection: vi.fn(),
}));

type AuthSession = Session | null;

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<AuthSession>>;
const createCollectionRecordMock = vi.mocked(createCollectionRecord);
const deleteCollectionRecordMock = vi.mocked(deleteCollectionRecord);
const updateCollectionRecordMock = vi.mocked(updateCollectionRecord);
const revalidatePathMock = vi.mocked(revalidatePath);
const validCollectionId = "cm11111111111111111111111";

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated creates", async () => {
    authMock.mockResolvedValue(null);

    await expect(createCollection(validCreateInput())).resolves.toEqual({
      success: false,
      code: "UNAUTHENTICATED",
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
      code: "INVALID_INPUT",
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/collections");
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
      code: "UNAVAILABLE",
      error: "Unable to create collection. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to create collection.",
      expect.any(Error)
    );
  });
});

describe("updateCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated updates", async () => {
    authMock.mockResolvedValue(null);

    await expect(
      updateCollection(validCollectionId, validCreateInput())
    ).resolves.toEqual({
      success: false,
      error: "You must be signed in to update collections.",
    });
    expect(updateCollectionRecordMock).not.toHaveBeenCalled();
  });

  test("rejects invalid collection ids", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));

    await expect(
      updateCollection("not-a-collection", validCreateInput())
    ).resolves.toEqual({
      success: false,
      error: "Collection not found.",
    });
    expect(updateCollectionRecordMock).not.toHaveBeenCalled();
  });

  test("passes normalized update data to the database helper", async () => {
    const updatedCollection = collection({
      id: validCollectionId,
      name: "Updated API Notes",
      description: "Updated metadata",
    });
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateCollectionRecordMock.mockResolvedValue(updatedCollection);

    await expect(
      updateCollection(validCollectionId, {
        name: "  Updated API Notes  ",
        description: "  Updated metadata  ",
      })
    ).resolves.toEqual({ success: true, data: updatedCollection });
    expect(updateCollectionRecordMock).toHaveBeenCalledWith(
      "user-1",
      validCollectionId,
      {
        name: "Updated API Notes",
        description: "Updated metadata",
      }
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/collections");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/collections/${validCollectionId}`
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/items/[type]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  test("returns not found when no owned collection is updated", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    updateCollectionRecordMock.mockResolvedValue(null);

    await expect(
      updateCollection(validCollectionId, validCreateInput())
    ).resolves.toEqual({
      success: false,
      error: "Collection not found.",
    });
  });
});

describe("deleteCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated deletes", async () => {
    authMock.mockResolvedValue(null);

    await expect(deleteCollection(validCollectionId)).resolves.toEqual({
      success: false,
      error: "You must be signed in to delete collections.",
    });
    expect(deleteCollectionRecordMock).not.toHaveBeenCalled();
  });

  test("deletes an owned collection and revalidates affected routes", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    deleteCollectionRecordMock.mockResolvedValue(true);

    await expect(deleteCollection(validCollectionId)).resolves.toEqual({
      success: true,
    });
    expect(deleteCollectionRecordMock).toHaveBeenCalledWith(
      "user-1",
      validCollectionId
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/collections");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/collections/${validCollectionId}`
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/items/[type]", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  test("returns not found when no owned collection is deleted", async () => {
    authMock.mockResolvedValue(sessionForUser("user-1"));
    deleteCollectionRecordMock.mockResolvedValue(false);

    await expect(deleteCollection(validCollectionId)).resolves.toEqual({
      success: false,
      error: "Collection not found.",
    });
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
