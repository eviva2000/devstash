import type { DashboardItemStats } from "@/features/dashboard/dashboard-types";
import { prisma } from "@/lib/prisma";

/**
 * Aggregate item counts for dashboard stats and sidebar nav badges.
 */
export async function getItemStats(userId: string): Promise<DashboardItemStats> {
  const [total, favorites, pinned, recent] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
    prisma.item.count({ where: { userId, isPinned: true } }),
    prisma.item.count({ where: { userId } }),
  ]);

  return {
    total,
    favorites,
    pinned,
    recent: Math.min(recent, 10),
  };
}

/**
 * Count a user's items by item type for the sidebar type list.
 */
export async function getItemTypeCounts(userId: string) {
  const counts = await prisma.item.groupBy({
    by: ["typeId"],
    where: { userId },
    _count: { _all: true },
  });

  return Object.fromEntries(
    counts.map((count) => [count.typeId, count._count._all])
  );
}
