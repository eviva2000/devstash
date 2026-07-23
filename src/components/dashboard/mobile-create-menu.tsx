"use client";

import { Menu } from "@base-ui/react/menu";
import { FileText, FolderOpen, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileCreateMenu({
  onCreateCollection,
  onCreateItem,
}: {
  readonly onCreateCollection: () => void;
  readonly onCreateItem: () => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Create new"
        className={cn(
          buttonVariants({ size: "icon", variant: "outline" }),
          "md:hidden"
        )}
      >
        <Plus />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" className="z-50" sideOffset={4}>
          <Menu.Popup className="w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Menu.Item
              className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              onClick={onCreateItem}
            >
              <FileText className="size-4 text-muted-foreground" />
              New Item
            </Menu.Item>
            <Menu.Item
              className="flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              onClick={onCreateCollection}
            >
              <FolderOpen className="size-4 text-muted-foreground" />
              New Collection
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
