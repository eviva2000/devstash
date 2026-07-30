import type { ReactNode } from "react";
import Link from "next/link";
import { Layers3 } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export function AuthPageShell({
  children,
  subtitle,
  title,
}: Readonly<{
  children: ReactNode;
  subtitle: string;
  title: string;
}>) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 py-6 text-foreground sm:py-10">
      <ThemeToggle className="absolute right-4 top-4" />

      <section className="w-full max-w-md">
        <Link
          className="mx-auto flex w-fit items-center gap-3 text-sidebar-foreground"
          href="/"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers3 className="size-5" />
          </span>
          <span className="text-sm font-semibold">DevStash</span>
        </Link>

        <div className="mt-6 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-2xl shadow-black/20 sm:mt-8 sm:p-6">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
