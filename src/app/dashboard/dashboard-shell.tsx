import { DashboardShellClient } from "./dashboard-shell-client";
import {
  getCollectionStats,
  getItemTypes,
  getRecentCollections,
} from "@/lib/db/collections";
import {
  mockItemTypes,
  mockCollections,
  mockItems,
} from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";

// TODO: Replace with the authenticated user once auth is wired up.
// For now, fall back to the first user in the database.
async function resolveDemoUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return user?.id ?? null;
}

export async function DashboardShell() {
  type RecentCollection = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    isFavorite: boolean;
    itemCount: number;
    dominantType?: { icon?: string | null; color?: string | null } | null;
    types?: Array<{ icon?: string | null; name: string; slug?: string }>;
  };

  type ItemType = {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    color?: string | null;
  };

  let recentCollections: RecentCollection[] = (mockCollections.slice(0, 6) as unknown) as RecentCollection[];
  let itemTypes: ItemType[] = (mockItemTypes as unknown) as ItemType[];
  let collectionStats = {
    total: mockCollections.length,
    favorites: mockCollections.filter((c) => c.isFavorite).length,
  };

  try {
    const userId = await resolveDemoUserId();
    if (!userId) {
      throw new Error("No user found in database; using mock data.");
    }

    const [dbCollections, dbTypes, dbStats] = await Promise.all([
      getRecentCollections(userId, 6),
      getItemTypes(userId),
      getCollectionStats(userId),
    ]);

    if (dbCollections.length > 0) {
      recentCollections = dbCollections as RecentCollection[];
      itemTypes = dbTypes as ItemType[];
      collectionStats = dbStats;
    }
  } catch (error) {
    console.warn("Failed to fetch collections from database, using mock data:", error);
  }

  return (
    <DashboardShellClient
      recentCollections={recentCollections}
      itemTypes={itemTypes}
      mockItems={mockItems}
      collectionStats={collectionStats}
    />
  );
}
