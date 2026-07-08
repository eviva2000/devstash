"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import {
  createCollection as createCollectionRecord,
  type CreateCollectionData,
} from "@/lib/db/collections";

type CreateCollectionResult =
  | { success: true; data: DashboardCollection }
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

export async function createCollection(
  data: unknown
): Promise<CreateCollectionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be signed in to create collections.",
      };
    }

    const parsedData = createCollectionSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: getValidationErrorMessage(parsedData.error),
      };
    }

    const createData: CreateCollectionData = parsedData.data;
    const createdCollection = await createCollectionRecord(
      session.user.id,
      createData
    );

    revalidatePath("/dashboard");
    revalidatePath("/items/[type]", "page");
    revalidatePath("/profile");

    return { success: true, data: createdCollection };
  } catch (error) {
    console.error("Failed to create collection.", error);
    return { success: false, error: "Unable to create collection. Try again." };
  }
}

function getValidationErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the collection details and try again.";
}
