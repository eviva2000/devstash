import { auth } from "@/auth";
import {
  isUploadItemType,
  validateUploadFile,
  type UploadItemType,
} from "@/lib/file-uploads";
import {
  createPendingItemUpload,
  deletePendingItemUpload,
  getPendingItemUpload,
} from "@/lib/db/items";
import { createR2ObjectKey, deleteR2Object, uploadR2Object } from "@/lib/storage/r2";
import {
  checkRateLimit,
  getClientIp,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";
import {
  ActiveProRequiredError,
  requireActiveProUser,
} from "@/lib/billing/entitlements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    "fileUpload",
    `${getClientIp(request)}:${session.user.id}`
  );

  if (!rateLimit.success) {
    return tooManyRequestsResponse(rateLimit.reset);
  }

  const formData = await request.formData();
  const itemTypeValue = formData.get("itemType");
  const uploadedFile = formData.get("file");

  if (typeof itemTypeValue !== "string" || !isUploadItemType(itemTypeValue)) {
    return Response.json({ error: "Choose a valid upload type." }, { status: 400 });
  }

  if (!(uploadedFile instanceof File)) {
    return Response.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const itemType: UploadItemType = itemTypeValue;
  const validation = validateUploadFile(uploadedFile, itemType);

  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    await requireActiveProUser(session.user.id);
  } catch (error) {
    if (error instanceof ActiveProRequiredError) {
      return Response.json(
        {
          code: error.code,
          error:
            error.code === "BILLING_PAST_DUE"
              ? "Update your payment method before uploading files or images."
              : "File and image uploads require an active Pro subscription.",
        },
        { status: 403 }
      );
    }

    throw error;
  }

  const key = createR2ObjectKey(session.user.id, uploadedFile.name);

  try {
    const body = Buffer.from(await uploadedFile.arrayBuffer());
    const contentType = uploadedFile.type || "application/octet-stream";

    await uploadR2Object({
      key,
      body,
      contentType,
    });

    const file = await createPendingItemUpload(session.user.id, itemType, {
      fileUrl: key,
      fileName: uploadedFile.name,
      fileMimeType: contentType,
      fileSize: uploadedFile.size,
    });

    return Response.json({
      file,
    });
  } catch (error) {
    console.error("Failed to upload file to R2.", error);

    try {
      await deleteR2Object(key);
    } catch (cleanupError) {
      console.error("Failed to clean up uploaded file after upload error.", cleanupError);
    }

    return Response.json(
      { error: "Unable to upload file. Try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    uploadToken?: unknown;
  } | null;
  const uploadToken = body?.uploadToken;

  if (
    typeof uploadToken !== "string" ||
    !/^c[a-z0-9]{24}$/.test(uploadToken)
  ) {
    return Response.json({ error: "Upload not found." }, { status: 404 });
  }

  const upload = await getPendingItemUpload(session.user.id, uploadToken);

  if (!upload) {
    return Response.json({ success: true });
  }

  try {
    await deleteR2Object(upload.fileUrl);
    await deletePendingItemUpload(session.user.id, uploadToken);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete pending upload.", error);

    return Response.json(
      { error: "Unable to remove upload. Try again." },
      { status: 500 }
    );
  }
}
