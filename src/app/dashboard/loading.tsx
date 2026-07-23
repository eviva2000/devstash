import { Layers3 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen overflow-hidden bg-background text-foreground"
    >
      <span className="sr-only">Loading dashboard</span>
      <DashboardSidebarSkeleton />

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="ml-auto size-8" />
          <Skeleton className="ml-auto hidden h-8 w-32 sm:block" />
          <Skeleton className="h-8 w-24" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
            <div className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  className="rounded-md border border-border bg-card p-4 text-card-foreground"
                  key={`stat-${index}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="size-8" />
                  </div>
                  <Skeleton className="mt-3 h-8 w-14" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              ))}
            </div>

            <DashboardGridSkeleton titleWidth="w-40" />
            <DashboardGridSkeleton titleWidth="w-28" />
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardSidebarSkeleton() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Layers3 className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-20 bg-sidebar-accent" />
          <Skeleton className="h-3 w-24 bg-sidebar-accent" />
        </div>
        <Skeleton className="size-8 bg-sidebar-accent" />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              className="h-9 w-full bg-sidebar-accent"
              key={`primary-${index}`}
            />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 bg-sidebar-accent" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              className="h-8 w-full bg-sidebar-accent"
              key={`type-${index}`}
            />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 bg-sidebar-accent" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              className="h-8 w-full bg-sidebar-accent"
              key={`collection-${index}`}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}

function DashboardGridSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <section className="space-y-4">
      <Skeleton className={`h-6 ${titleWidth}`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="flex min-h-36 flex-col rounded-md border border-border bg-card p-4"
            key={`card-${index}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-6 w-9 rounded-full" />
            </div>
            <div className="mt-auto flex items-center justify-between pt-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-4" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
