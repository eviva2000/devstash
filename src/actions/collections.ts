"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import {
  createCollection as createCollectionRecord,
  deleteCollection as deleteCollectionRecord,
  isCreateCollectionFailure,
  updateCollection as updateCollectionRecord,
  type CreateCollectionData,
  type UpdateCollectionData,
} from "@/lib/db/collections";
import { cuidSchema, getFirstZodError } from "@/lib/validation";

type CreateCollectionResult =
  | { success: true; data: DashboardCollection }
  | {
      success: false;
      code:
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "UNAVAILABLE"
        | "COLLECTION_LIMIT_REACHED";
      error: string;
    };

type UpdateCollectionResult =
  | { success: true; data: DashboardCollection }
  | { success: false; error: string };

type DeleteCollectionResult =
  | { success: true }
  | { success: false; error: string };

const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name is too long."),
  description: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
    z.string().max(500, "Description is too long.").nullable()
  ),
});

const collectionIdSchema = cuidSchema("Collection not found.");

export async function createCollection(
  data: unknown
): Promise<CreateCollectionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "You must be signed in to create collections.",
      };
    }

    const parsedData = createCollectionSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        code: "INVALID_INPUT",
        error: getFirstZodError(
          parsedData.error,
          "Check the collection details and try again."
        ),
      };
    }

    const createData: CreateCollectionData = parsedData.data;
    const createdCollection = await createCollectionRecord(
      session.user.id,
      createData
    );

    if (isCreateCollectionFailure(createdCollection)) {
      return {
        success: false,
        code: createdCollection.code,
        error:
          "You have reached the Free plan limit of 3 collections. Upgrade to add more.",
      };
    }

    revalidateCollectionPaths();

    return { success: true, data: createdCollection };
  } catch (error) {
    console.error("Failed to create collection.", error);
    return {
      success: false,
      code: "UNAVAILABLE",
      error: "Unable to create collection. Try again.",
    };
  }
}

export async function updateCollection(
  collectionId: string,
  data: unknown
): Promise<UpdateCollectionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be signed in to update collections.",
      };
    }

    const parsedCollectionId = collectionIdSchema.safeParse(collectionId);

    if (!parsedCollectionId.success) {
      return { success: false, error: "Collection not found." };
    }

    const parsedData = createCollectionSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: getFirstZodError(
          parsedData.error,
          "Check the collection details and try again."
        ),
      };
    }

    const updateData: UpdateCollectionData = parsedData.data;
    const updatedCollection = await updateCollectionRecord(
      session.user.id,
      parsedCollectionId.data,
      updateData
    );

    if (!updatedCollection) {
      return { success: false, error: "Collection not found." };
    }

    revalidateCollectionPaths(parsedCollectionId.data);

    return { success: true, data: updatedCollection };
  } catch (error) {
    console.error("Failed to update collection.", error);
    return { success: false, error: "Unable to update collection. Try again." };
  }
}

export async function deleteCollection(
  collectionId: string
): Promise<DeleteCollectionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be signed in to delete collections.",
      };
    }

    const parsedCollectionId = collectionIdSchema.safeParse(collectionId);

    if (!parsedCollectionId.success) {
      return { success: false, error: "Collection not found." };
    }

    const deleted = await deleteCollectionRecord(
      session.user.id,
      parsedCollectionId.data
    );

    if (!deleted) {
      return { success: false, error: "Collection not found." };
    }

    revalidateCollectionPaths(parsedCollectionId.data);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete collection.", error);
    return { success: false, error: "Unable to delete collection. Try again." };
  }
}

function revalidateCollectionPaths(collectionId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/collections");
  if (collectionId) {
    revalidatePath(`/collections/${collectionId}`);
  }
  revalidatePath("/items/[type]", "page");
  revalidatePath("/profile");
}
