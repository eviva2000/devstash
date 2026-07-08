"use client";

import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import { cn } from "@/lib/utils";

export function CollectionSelector({
  collections,
  disabled,
  label = "Collections",
  onChange,
  selectedIds,
}: {
  collections: DashboardCollection[];
  disabled: boolean;
  label?: string;
  onChange: (collectionIds: string[]) => void;
  selectedIds: string[];
}) {
  const selectedIdSet = new Set(selectedIds);
  const selectedCollections = collections.filter((collection) =>
    selectedIdSet.has(collection.id)
  );
  const triggerLabel =
    selectedCollections.length === 0
      ? "Select collections"
      : selectedCollections.length === 1
        ? selectedCollections[0].name
        : `${selectedCollections.length} collections`;

  function toggleCollection(collectionId: string) {
    if (disabled) {
      return;
    }

    if (selectedIdSet.has(collectionId)) {
      onChange(selectedIds.filter((id) => id !== collectionId));
      return;
    }

    onChange([...selectedIds, collectionId]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {selectedIds.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      <Popover>
        <PopoverTrigger
          className="w-full"
          disabled={disabled || collections.length === 0}
          render={
            <Button
              className="w-full justify-between"
              disabled={disabled || collections.length === 0}
              type="button"
              variant="outline"
            />
          }
        >
          <span className="min-w-0 truncate text-left">{triggerLabel}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent className="w-[var(--anchor-width)] min-w-72 p-1">
          <div className="grid max-h-56 gap-1 overflow-y-auto">
            {collections.map((collection) => {
              const isSelected = selectedIdSet.has(collection.id);

              return (
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                  key={collection.id}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    onChange={() => toggleCollection(collection.id)}
                    type="checkbox"
                  />
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border border-border",
                      isSelected && "border-primary bg-primary text-primary-foreground"
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {collection.itemCount}
                  </span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {collections.length === 0 && (
        <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No collections yet.
        </div>
      )}
    </div>
  );
}
