import { prisma } from "@/lib/prisma";
import { getUsageLimits } from "@/lib/usage-limits";

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
          plan: true,
          subscriptionStatus: true,
          stripeCustomerId: true,
          stripePriceId: true,
          stripeCurrentPeriodEnd: true,
          stripeCancelAtPeriodEnd: true,
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
  const entitlements = getUsageLimits(user);
  const billingInterval: "monthly" | "yearly" | null =
    user.stripePriceId === process.env.STRIPE_PRICE_ID_MONTHLY
      ? "monthly"
      : user.stripePriceId === process.env.STRIPE_PRICE_ID_YEARLY
        ? "yearly"
        : null;

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
    billing: {
      plan:
        entitlements.hasActivePro ||
        user.subscriptionStatus === "PAST_DUE"
          ? ("PRO" as const)
          : ("FREE" as const),
      status: user.subscriptionStatus,
      interval: billingInterval,
      currentPeriodEnd: user.stripeCurrentPeriodEnd,
      cancelAtPeriodEnd: user.stripeCancelAtPeriodEnd,
      canManageBilling: Boolean(user.stripeCustomerId),
      hasActivePro: entitlements.hasActivePro,
      itemUsage: {
        used: totalItems,
        limit: entitlements.itemLimit,
      },
      collectionUsage: {
        used: totalCollections,
        limit: entitlements.collectionLimit,
      },
    },
    itemTypes: itemTypes.map((type) => ({
      ...type,
      count: countsByTypeId.get(type.id) ?? 0,
    })),
  };
}
