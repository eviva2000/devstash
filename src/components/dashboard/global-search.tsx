"use client";

import { FileText, Folder, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { ItemContentDrawer } from "@/components/dashboard/item-content-drawer";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import type {
  DashboardCollection,
  GlobalSearchCollection,
  GlobalSearchItem,
} from "@/features/dashboard/dashboard-types";
import { filterGlobalSearchResult } from "@/features/dashboard/global-search-filter";
import { getTypeColorStyle } from "@/features/dashboard/dashboard-utils";
import { getIconComponent } from "@/lib/icon-map";

export function GlobalSearch({
  collections,
  isPro,
  items,
  searchCollections,
}: {
  readonly collections: DashboardCollection[];
  readonly isPro: boolean;
  readonly items: GlobalSearchItem[];
  readonly searchCollections: GlobalSearchCollection[];
}) {
  const router = useRouter();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isItemDrawerOpen, setIsItemDrawerOpen] = useState(false);
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  );

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setQuery("");
        setIsPaletteOpen((isOpen) => !isOpen);
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  function handlePaletteOpenChange(open: boolean) {
    setIsPaletteOpen(open);

    if (!open) {
      setQuery("");
    }
  }

  function openPalette() {
    setIsPaletteOpen(true);
  }

  function handleSearchTriggerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPalette();
    }
  }

  function openItem(itemId: string) {
    setIsPaletteOpen(false);
    setQuery("");
    setSelectedItemId(itemId);
    setIsItemDrawerOpen(true);
  }

  function openCollection(collectionId: string) {
    setIsPaletteOpen(false);
    setQuery("");
    router.push(`/collections/${collectionId}`);
  }

  return (
    <>
      <Button
        aria-expanded={isPaletteOpen}
        aria-haspopup="dialog"
        aria-label="Search items and collections"
        className="md:hidden"
        onClick={openPalette}
        size="icon"
        type="button"
        variant="outline"
      >
        <Search />
      </Button>

      <div className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-expanded={isPaletteOpen}
          aria-haspopup="dialog"
          aria-label="Search items and collections"
          className="cursor-pointer pl-8 pr-14"
          onClick={openPalette}
          onKeyDown={handleSearchTriggerKeyDown}
          placeholder="Search items and collections…"
          readOnly
          type="search"
          value=""
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
        >
          ⌘ K
        </kbd>
      </div>

      <CommandDialog
        className="max-w-xl"
        description="Fuzzy search across all of your items and collections."
        onOpenChange={handlePaletteOpenChange}
        open={isPaletteOpen}
        title="Global search"
      >
        <Command filter={filterGlobalSearchResult}>
          <CommandInput
            autoFocus
            onValueChange={setQuery}
            placeholder="Search items and collections..."
            value={query}
          />
          <CommandList className="max-h-[min(420px,60vh)]">
            <CommandEmpty>No items or collections found.</CommandEmpty>

            <CommandGroup heading="Items">
              {items.map((item) => {
                const TypeIcon = getIconComponent(item.type.icon) ?? FileText;

                return (
                  <CommandItem
                    key={item.id}
                    keywords={[
                      item.title,
                      item.type.name,
                      item.type.slug,
                      item.preview,
                    ]}
                    onSelect={() => openItem(item.id)}
                    value={`item-${item.id}`}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                      style={getTypeColorStyle(item.type.color)}
                    >
                      <TypeIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.preview ||
                          `No ${item.type.name.toLowerCase()} preview`}
                      </span>
                    </span>
                    <CommandShortcut className="normal-case tracking-normal">
                      {item.type.name}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Collections">
              {searchCollections.map((collection) => (
                <CommandItem
                  key={collection.id}
                  keywords={[collection.name]}
                  onSelect={() => openCollection(collection.id)}
                  value={`collection-${collection.id}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                    <Folder className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {collection.name}
                  </span>
                  <CommandShortcut className="normal-case tracking-normal">
                    {collection.itemCount}{" "}
                    {collection.itemCount === 1 ? "item" : "items"}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      <ItemContentDrawer
        collections={collections}
        isOpen={isItemDrawerOpen}
        isPro={isPro}
        itemId={selectedItemId}
        onClose={() => setIsItemDrawerOpen(false)}
        onClosed={() => setSelectedItemId(null)}
        type={selectedItem?.type}
      />
    </>
  );
}
