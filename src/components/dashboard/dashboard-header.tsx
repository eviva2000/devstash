"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { CollectionCreateDialog } from "@/components/dashboard/collection-create-dialog";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ItemCreateDialog } from "@/components/dashboard/item-create-dialog";
import { MobileCreateMenu } from "@/components/dashboard/mobile-create-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type {
  DashboardCollection,
  DashboardItemType,
  DashboardPlanUsage,
  GlobalSearchCollection,
  GlobalSearchItem,
} from "@/features/dashboard/dashboard-types";

export function DashboardHeader({
  collections,
  initialCreateTypeSlug,
  isMobileDrawerOpen,
  isPro,
  itemTypes,
  onOpenMobileDrawer,
  searchCollections,
  searchItems,
  usage,
}: {
  readonly collections: DashboardCollection[];
  readonly initialCreateTypeSlug?: string;
  readonly isMobileDrawerOpen: boolean;
  readonly isPro: boolean;
  readonly itemTypes: DashboardItemType[];
  readonly onOpenMobileDrawer: () => void;
  readonly searchCollections: GlobalSearchCollection[];
  readonly searchItems: GlobalSearchItem[];
  readonly usage: DashboardPlanUsage;
}) {
  const [isCollectionCreateOpen, setIsCollectionCreateOpen] = useState(false);
  const [isItemCreateOpen, setIsItemCreateOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <Button
        aria-expanded={isMobileDrawerOpen}
        aria-label="Open sidebar"
        className="md:hidden"
        onClick={onOpenMobileDrawer}
        size="icon"
        type="button"
        variant="outline"
      >
        <Menu />
      </Button>

      <GlobalSearch
        collections={collections}
        isPro={isPro}
        items={searchItems}
        searchCollections={searchCollections}
      />

      <ThemeToggle className="ml-auto md:ml-0" />

      <MobileCreateMenu
        onCreateCollection={() => setIsCollectionCreateOpen(true)}
        onCreateItem={() => setIsItemCreateOpen(true)}
      />

      <CollectionCreateDialog
        onOpenChange={setIsCollectionCreateOpen}
        open={isCollectionCreateOpen}
        triggerClassName="ml-auto hidden md:inline-flex"
        usage={usage}
      />

      <ItemCreateDialog
        collections={collections}
        initialTypeSlug={initialCreateTypeSlug}
        isPro={isPro}
        itemTypes={itemTypes}
        onOpenChange={setIsItemCreateOpen}
        open={isItemCreateOpen}
        triggerClassName="hidden md:inline-flex"
        usage={usage}
      />
    </header>
  );
}
