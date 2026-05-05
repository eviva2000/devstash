import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar px-5 py-6 text-sidebar-foreground md:block">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground">
          Sidebar
        </h2>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 md:px-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search items"
              className="pl-8"
              placeholder="Search items..."
              type="search"
            />
          </div>

          <Button className="ml-auto" type="button">
            <Plus data-icon="inline-start" />
            New Item
          </Button>
        </header>

        <div className="flex flex-1 bg-background px-4 py-6 md:px-6">
          <h2 className="text-2xl font-semibold">Main</h2>
        </div>
      </section>
    </main>
  );
}
