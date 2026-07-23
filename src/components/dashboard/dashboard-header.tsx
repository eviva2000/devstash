import { Menu } from "lucide-react";

import { CollectionCreateDialog } from "@/components/dashboard/collection-create-dialog";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { ItemCreateDialog } from "@/components/dashboard/item-create-dialog";
import { Button } from "@/components/ui/button";
import type {
  DashboardCollection,
  DashboardItemType,
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
}: {
  readonly collections: DashboardCollection[];
  readonly initialCreateTypeSlug?: string;
  readonly isMobileDrawerOpen: boolean;
  readonly isPro: boolean;
  readonly itemTypes: DashboardItemType[];
  readonly onOpenMobileDrawer: () => void;
  readonly searchCollections: GlobalSearchCollection[];
  readonly searchItems: GlobalSearchItem[];
}) {
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

      <CollectionCreateDialog />

      <ItemCreateDialog
        collections={collections}
        initialTypeSlug={initialCreateTypeSlug}
        isPro={isPro}
        itemTypes={itemTypes}
      />
    </header>
  );
}
