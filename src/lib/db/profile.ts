import { prisma } from "@/lib/prisma";

export async function getProfileOverview(userId: string) {
  const [user, totalItems, totalCollections, itemTypes, itemTypeCounts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          passwordHash: true,
          createdAt: true,
          accounts: {
            select: {
              provider: true,
              type: true,
            },
          },
        },
      }),
      prisma.item.count({ where: { userId } }),
      prisma.collection.count({ where: { userId } }),
      prisma.itemType.findMany({
        where: {
          OR: [{ isSystem: true }, { userId }],
        },
        orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          color: true,
          isSystem: true,
        },
      }),
      prisma.item.groupBy({
        by: ["typeId"],
        where: { userId },
        _count: { _all: true },
      }),
    ]);

  if (!user) {
    return null;
  }

  const countsByTypeId = new Map(
    itemTypeCounts.map((count) => [count.typeId, count._count._all])
  );
  const hasOAuthAccount = user.accounts.some(
    (account) => account.provider !== "credentials"
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      canChangePassword: Boolean(user.passwordHash) && !hasOAuthAccount,
      providers: user.accounts.map((account) => account.provider),
    },
    stats: {
      totalItems,
      totalCollections,
      totalTypes: itemTypes.length,
    },
    itemTypes: itemTypes.map((type) => ({
      ...type,
      count: countsByTypeId.get(type.id) ?? 0,
    })),
  };
}
