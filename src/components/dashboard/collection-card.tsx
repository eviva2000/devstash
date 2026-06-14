import { ArrowUpRight, Folder, Star } from "lucide-react";
import Link from "next/link";

import {
  getTypeBorderStyle,
  typeBorderColorMap,
} from "@/features/dashboard/dashboard-utils";
import { getIconComponent } from "@/lib/icon-map";

interface EnhancedCollection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isFavorite: boolean;
  itemCount: number;
  dominantType?: { icon?: string | null; color?: string | null } | null;
  types?: Array<{ icon?: string | null; name: string; slug?: string }>;
}

export function CollectionCard({
  collection,
}: {
  collection: EnhancedCollection;
}) {
  const borderColor =
    typeBorderColorMap[
      collection.dominantType?.color as keyof typeof typeBorderColorMap
    ] ?? "border-border";

  return (
    <Link
      className={`group flex min-h-36 flex-col rounded-md border ${borderColor} bg-card p-4 text-card-foreground transition-colors hover:border-muted-foreground/40`}
      href={`/collections/${collection.slug}`}
      style={getTypeBorderStyle(collection.dominantType?.color)}
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

      {collection.types && collection.types.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {collection.types.map((type, idx) => {
            const IconComponent = getIconComponent(type.icon);
            if (!IconComponent) return null;
            return (
              <span
                aria-label={type.name}
                className="flex size-6 items-center justify-center rounded bg-muted/50 text-muted-foreground"
                key={`${collection.id}-type-${idx}`}
                title={type.name}
              >
                <IconComponent className="size-3.5" />
              </span>
            );
          })}
        </div>
      )}

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
