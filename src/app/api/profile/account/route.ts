import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  await prisma.user.deleteMany({
    where: { id: session.user.id },
  });

  return Response.json({ ok: true });
}
