import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export function StatCard({
  detail,
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  detail: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            iconClassName
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
