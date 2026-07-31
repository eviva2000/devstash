"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import type {
  DashboardItem,
  DashboardItemDetail,
} from "@/features/dashboard/dashboard-types";
import { deleteR2Object } from "@/lib/storage/r2";
import { cuidSchema, getFirstZodError, isCuid } from "@/lib/validation";
import {
  createItem as createItemRecord,
  deleteItem as deleteItemRecord,
  getItemDetailById,
  getItemsByCollectionIdPage,
  getItemsByTypeSlugPage,
  isCreateItemFailure,
  updateItem as updateItemRecord,
  type CreateItemFailureCode,
  type CreateItemData,
  type UpdateItemData,
} from "@/lib/db/items";

type CreateItemResult =
  | { success: true; data: DashboardItemDetail }
  | {
      success: false;
      code:
        | CreateItemFailureCode
        | "UNAUTHENTICATED"
        | "INVALID_INPUT"
        | "UNAVAILABLE";
      error: string;
    };

type UpdateItemResult =
  | { success: true; data: DashboardItemDetail }
  | { success: false; error: string };

type DeleteItemResult =
  | { success: true }
  | { success: false; error: string };

type LoadMoreItemsResult =
  | {
      success: true;
      data: {
        items: DashboardItem[];
        nextCursor: string | null;
      };
    }
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
  collectionIds: z
    .array(cuidSchema("Choose a valid collection."))
    .max(50, "Too many collections.")
    .default([]),
});

const createItemSchema = updateItemSchema
  .extend({
    typeSlug: z.enum(["snippet", "prompt", "command", "note", "link", "file", "image"], {
      error: "Choose a valid item type.",
    }),
    file: z
      .object({
        uploadToken: cuidSchema("Upload a file first."),
      })
      .nullable()
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.typeSlug === "link" && !data.url) {
      context.addIssue({
        code: "custom",
        message: "URL is required for links.",
        path: ["url"],
      });
    }

    if ((data.typeSlug === "file" || data.typeSlug === "image") && !data.file) {
      context.addIssue({
        code: "custom",
        message: "Upload a file first.",
        path: ["file"],
      });
    }
  });

const loadMoreItemsSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("type"),
    scopeId: z.string().trim().min(1).max(100),
    cursor: cuidSchema(),
  }),
  z.object({
    scope: z.literal("collection"),
    scopeId: cuidSchema(),
    cursor: cuidSchema(),
  }),
]);

export async function loadMoreItems(
  input: unknown
): Promise<LoadMoreItemsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to load items." };
  }

  const parsed = loadMoreItemsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "Unable to load more items." };
  }

  try {
    const page =
      parsed.data.scope === "type"
        ? await getItemsByTypeSlugPage(
            session.user.id,
            parsed.data.scopeId,
            { cursor: parsed.data.cursor }
          )
        : await getItemsByCollectionIdPage(
            session.user.id,
            parsed.data.scopeId,
            { cursor: parsed.data.cursor }
          );

    return {
      success: true,
      data: {
        items: page.items,
        nextCursor: page.nextCursor,
      },
    };
  } catch (error) {
    console.error("Failed to load more items.", error);
    return { success: false, error: "Unable to load more items. Try again." };
  }
}

export async function createItem(data: unknown): Promise<CreateItemResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "You must be signed in to create items.",
      };
    }

    const parsedData = createItemSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        code: "INVALID_INPUT",
        error: getFirstZodError(
          parsedData.error,
          "Check the item details and try again."
        ),
      };
    }

    const createData: CreateItemData = parsedData.data;
    const createdItem = await createItemRecord(session.user.id, createData);

    if (isCreateItemFailure(createdItem)) {
      return {
        success: false,
        code: createdItem.code,
        error: getCreateItemFailureMessage(createdItem.code),
      };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/items/${createdItem.type.slug}`);

    return { success: true, data: createdItem };
  } catch (error) {
    console.error("Failed to create item.", error);
    return {
      success: false,
      code: "UNAVAILABLE",
      error: "Unable to create item. Try again.",
    };
  }
}

export async function updateItem(
  itemId: string,
  data: unknown
): Promise<UpdateItemResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "You must be signed in to update items." };
    }

    if (!isCuid(itemId)) {
      return { success: false, error: "Item not found." };
    }

    const parsedData = updateItemSchema.safeParse(data);

    if (!parsedData.success) {
      return {
        success: false,
        error: getFirstZodError(
          parsedData.error,
          "Check the item details and try again."
        ),
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

    if (!isCuid(itemId)) {
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

    if (existingItem.fileUrl) {
      try {
        await deleteR2Object(existingItem.fileUrl);
      } catch (error) {
        console.error("Failed to delete file from R2.", error);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/items/${existingItem.type.slug}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete item.", error);
    return { success: false, error: "Unable to delete item. Try again." };
  }
}

function getCreateItemFailureMessage(code: CreateItemFailureCode): string {
  switch (code) {
    case "ITEM_LIMIT_REACHED":
      return "You have reached the Free plan limit of 50 items. Upgrade to add more.";
    case "PRO_REQUIRED":
      return "File and image uploads require an active Pro subscription.";
    case "BILLING_PAST_DUE":
      return "Update your payment method before uploading files or images.";
    case "INVALID_COLLECTION":
      return "Choose collections that belong to your account.";
    case "INVALID_UPLOAD":
      return "Upload a file first.";
    case "INVALID_ITEM_TYPE":
      return "Choose a valid item type.";
  }
}
