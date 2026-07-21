import { Menu, Search } from "lucide-react";

import { CollectionCreateDialog } from "@/components/dashboard/collection-create-dialog";
import { ItemCreateDialog } from "@/components/dashboard/item-create-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DashboardCollection,
  DashboardItemType,
} from "@/features/dashboard/dashboard-types";

export function DashboardHeader({
  collections,
  initialCreateTypeSlug,
  isMobileDrawerOpen,
  isPro,
  itemTypes,
  onOpenMobileDrawer,
}: {
  collections: DashboardCollection[];
  initialCreateTypeSlug?: string;
  isMobileDrawerOpen: boolean;
  isPro: boolean;
  itemTypes: DashboardItemType[];
  onOpenMobileDrawer: () => void;
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

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search items"
          className="pl-8"
          placeholder="Search items..."
          type="search"
        />
      </div>

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
