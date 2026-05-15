import { ArrowUpRight, Folder, Star } from "lucide-react";
import Link from "next/link";

import type { DashboardCollection } from "@/features/dashboard/dashboard-types";

export function CollectionCard({
  collection,
}: {
  collection: DashboardCollection;
}) {
  return (
    <Link
      className="group flex min-h-36 flex-col rounded-md border border-border bg-card p-4 text-card-foreground transition-colors hover:border-muted-foreground/40"
      href={`/collections/${collection.slug}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {collection.name}
            </h3>
            {collection.isFavorite && (
              <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {collection.description}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          {collection.itemCount}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Folder className="size-4" />
          Collection
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </Link>
  );
}
