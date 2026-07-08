import { Skeleton } from "@/components/ui/skeleton";

const META_SKELETON_KEYS = ["type", "collection", "created", "updated"];

export function ItemDrawerSkeleton() {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {META_SKELETON_KEYS.map((key) => (
          <Skeleton className="h-16" key={key} />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  );
}
