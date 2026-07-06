import { auth } from "@/auth";
import { getItemDetailById } from "@/lib/db/items";
import { getR2Object } from "@/lib/storage/r2";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const item = await getItemDetailById(session.user.id, id);

  if (!item?.fileUrl || !item.fileName) {
    return Response.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const object = await getR2Object(item.fileUrl);
    const body = object.Body?.transformToWebStream();

    if (!body) {
      return Response.json({ error: "File not found." }, { status: 404 });
    }

    const url = new URL(request.url);
    const isPreview = url.searchParams.get("preview") === "1";
    const contentType =
      item.fileMimeType ?? object.ContentType ?? "application/octet-stream";
    const disposition = isPreview && contentType.startsWith("image/")
      ? "inline"
      : "attachment";
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${sanitizeHeaderFileName(item.fileName)}"`,
    });

    if (item.fileSize) {
      headers.set("Content-Length", String(item.fileSize));
    }

    return new Response(body, { headers });
  } catch (error) {
    console.error("Failed to download file from R2.", error);

    return Response.json(
      { error: "Unable to download file. Try again." },
      { status: 500 }
    );
  }
}

function sanitizeHeaderFileName(fileName: string) {
  return fileName.replace(/["\\\r\n]/g, "_");
}
