"use server";

import { z } from "zod";

import { auth } from "@/auth";
import type { DashboardItemDetail } from "@/features/dashboard/dashboard-types";
import {
  updateItem as updateItemRecord,
  type UpdateItemData,
} from "@/lib/db/items";

type UpdateItemResult =
  | { success: true; data: DashboardItemDetail }
  | { success: false; error: string };

const nullableTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
  z.string().nullable()
);

const nullableUrlString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
  z.string().url("Enter a valid URL.").nullable()
);

const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: nullableTrimmedString,
  content: nullableTrimmedString,
  language: nullableTrimmedString,
  url: nullableUrlString,
  tags: z
    .array(z.string().trim().min(1))
    .transform((tags) => Array.from(new Set(tags))),
});

export async function updateItem(
  itemId: string,
  data: unknown
): Promise<UpdateItemResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "You must be signed in to update items." };
    }

    const parsedData = updateItemSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: getValidationErrorMessage(parsedData.error),
      };
    }

    const updateData: UpdateItemData = parsedData.data;
    const updatedItem = await updateItemRecord(session.user.id, itemId, updateData);

    if (!updatedItem) {
      return { success: false, error: "Item not found." };
    }

    return { success: true, data: updatedItem };
  } catch (error) {
    console.error("Failed to update item.", error);
    return { success: false, error: "Unable to update item. Try again." };
  }
}

function getValidationErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the item details and try again.";
}
