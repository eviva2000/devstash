import "server-only";

import { prisma } from "@/lib/prisma";

export async function isProUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  return user?.plan === "PRO";
}
