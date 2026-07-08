"use client";

import { Folder, Heart, Layers3, Star } from "lucide-react";
import { useState } from "react";

import type {
  DashboardCollection,
  DashboardData,
  DashboardItemStats,
} from "@/features/dashboard/dashboard-types";

import { CollectionCard } from "./collection-card";
import { DashboardSection } from "./dashboard-section";
import { ItemCard } from "./item-card";
import { ItemContentDrawer } from "./item-content-drawer";
import { StatCard } from "./stat-card";

interface ExtendedCollection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isFavorite: boolean;
  itemCount: number;
  dominantType?: { icon?: string | null; color?: string | null } | null;
  types?: Array<{ icon?: string | null; name: string; slug?: string }>;
}

export function DashboardMain({
  data,
  extendedCollections,
  collectionStats,
  collections,
  itemStats,
}: {
  readonly data: DashboardData;
  readonly extendedCollections?: ExtendedCollection[];
  readonly collectionStats: { readonly total: number; readonly favorites: number };
  readonly collections: DashboardCollection[];
  readonly itemStats: DashboardItemStats;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const selectedItem =
    selectedItemId === null
      ? undefined
      : [...data.pinnedItems, ...data.recentItems].find(
          (item) => item.id === selectedItemId
        );
  const selectedType = selectedItem
    ? data.typeById.get(selectedItem.typeId)
    : undefined;

  const openItemDrawer = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsItemDrawerOpen(true);
  };
  const closeItemDrawer = () => setIsItemDrawerOpen(false);

  // Prefer DB-backed collections (with type metadata) when provided;
  // fall back to the in-memory shape from DashboardData.
  const collectionsToRender: ExtendedCollection[] =
    extendedCollections && extendedCollections.length > 0
      ? extendedCollections
      : data.recentCollections.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          isFavorite: c.isFavorite,
          itemCount: c.itemCount,
        }));

  const stats = [
    {
      label: "Items",
      value: itemStats.total,
      detail: `${data.typeById.size} item types`,
      icon: Layers3,
      iconClassName: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "Collections",
      value: collectionStats.total,
      detail: `${collectionsToRender.length} recently used`,
      icon: Folder,
      iconClassName: "bg-emerald-500/15 text-emerald-400",
    },
    {
      label: "Favorite Items",
      value: itemStats.favorites,
      detail: "Saved for quick access",
      icon: Star,
      iconClassName: "bg-amber-500/15 text-amber-400",
    },
    {
      label: "Favorite Collections",
      value: collectionStats.favorites,
      detail: "Pinned collection groups",
      icon: Heart,
      iconClassName: "bg-rose-500/15 text-rose-400",
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {itemStats.total} items
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 min-[1420px]:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <DashboardSection title="Recent Collections">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {collectionsToRender.map((collection) => (
              <CollectionCard collection={collection} key={collection.id} />
            ))}
          </div>
        </DashboardSection>

        {data.pinnedItems.length > 0 && (
          <DashboardSection title="Pinned Items">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.pinnedItems.map((item) => (
                <ItemCard
                  collection={getCollection(data, item.collectionId)}
                  item={item}
                  key={item.id}
                  onOpen={() => openItemDrawer(item.id)}
                  type={data.typeById.get(item.typeId)}
                />
              ))}
            </div>
          </DashboardSection>
        )}

        <DashboardSection title="Recent Items">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.recentItems.map((item) => (
              <ItemCard
                collection={getCollection(data, item.collectionId)}
                item={item}
                key={item.id}
                onOpen={() => openItemDrawer(item.id)}
                type={data.typeById.get(item.typeId)}
              />
            ))}
          </div>
        </DashboardSection>
      </div>

      <ItemContentDrawer
        collections={collections}
        isOpen={isItemDrawerOpen}
        item={selectedItem}
        itemId={selectedItemId}
        onClose={closeItemDrawer}
        onClosed={() => setSelectedItemId(null)}
        type={selectedType}
      />
    </div>
  );
}

function getCollection(data: DashboardData, collectionId: string | null) {
  return collectionId ? data.collectionById.get(collectionId) : undefined;
}
