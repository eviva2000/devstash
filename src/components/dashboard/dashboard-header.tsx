import { FolderOpen, Menu, Search } from "lucide-react";

import { ItemCreateDialog } from "@/components/dashboard/item-create-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardItemType } from "@/features/dashboard/dashboard-types";

export function DashboardHeader({
  initialCreateTypeSlug,
  isMobileDrawerOpen,
  itemTypes,
  onOpenMobileDrawer,
}: {
  initialCreateTypeSlug?: string;
  isMobileDrawerOpen: boolean;
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

      <Button
        className="ml-auto hidden sm:inline-flex"
        type="button"
        variant="outline"
      >
        <FolderOpen data-icon="inline-start" />
        New Collection
      </Button>

      <ItemCreateDialog
        initialTypeSlug={initialCreateTypeSlug}
        itemTypes={itemTypes}
      />
    </header>
  );
}
