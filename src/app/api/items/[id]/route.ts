import { auth } from "@/auth";
import { getItemDetailById } from "@/lib/db/items";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return Response.json({ error: "Item id is required." }, { status: 400 });
  }

  const item = await getItemDetailById(session.user.id, id);

  if (!item) {
    return Response.json({ error: "Item not found." }, { status: 404 });
  }

  return Response.json({ item });
}
