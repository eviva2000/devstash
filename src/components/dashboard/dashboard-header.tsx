import { FolderOpen, Menu, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardHeader({
  isMobileDrawerOpen,
  onOpenMobileDrawer,
}: {
  isMobileDrawerOpen: boolean;
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

      <Button className="ml-auto sm:ml-0" type="button">
        <Plus data-icon="inline-start" />
        New Item
      </Button>
    </header>
  );
}
