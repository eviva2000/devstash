"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import type { DashboardItemDetail } from "@/features/dashboard/dashboard-types";
import {
  deleteItem as deleteItemRecord,
  getItemDetailById,
  updateItem as updateItemRecord,
  type UpdateItemData,
} from "@/lib/db/items";

type UpdateItemResult =
  | { success: true; data: DashboardItemDetail }
  | { success: false; error: string };

type DeleteItemResult =
  | { success: true }
  | { success: false; error: string };

const nullableTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
    z.string().max(max, `Must be ${max} characters or fewer.`).nullable()
  );

const nullableUrlString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value ?? null),
  z
    .string()
    .url("Enter a valid URL.")
    .max(2048, "URL is too long.")
    .refine(
      (value) => /^https?:\/\//i.test(value),
      "URL must start with http:// or https://"
    )
    .nullable()
);

const updateItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title is too long."),
  description: nullableTrimmedString(2000),
  content: nullableTrimmedString(50000),
  language: nullableTrimmedString(50),
  url: nullableUrlString,
  tags: z
    .array(z.string().trim().min(1).max(50, "Tag is too long."))
    .max(30, "Too many tags."),
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

    if (!/^c[a-z0-9]{24}$/.test(itemId)) {
      return { success: false, error: "Item not found." };
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

    revalidatePath("/dashboard");
    revalidatePath(`/items/${updatedItem.type.slug}`);

    return { success: true, data: updatedItem };
  } catch (error) {
    console.error("Failed to update item.", error);
    return { success: false, error: "Unable to update item. Try again." };
  }
}

export async function deleteItem(itemId: string): Promise<DeleteItemResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "You must be signed in to delete items." };
    }

    if (!/^c[a-z0-9]{24}$/.test(itemId)) {
      return { success: false, error: "Item not found." };
    }

    const existingItem = await getItemDetailById(session.user.id, itemId);

    if (!existingItem) {
      return { success: false, error: "Item not found." };
    }

    const deleted = await deleteItemRecord(session.user.id, itemId);

    if (!deleted) {
      return { success: false, error: "Item not found." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/items/${existingItem.type.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete item.", error);
    return { success: false, error: "Unable to delete item. Try again." };
  }
}

function getValidationErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the item details and try again.";
}
