import type { ReactNode } from "react";
import Link from "next/link";
import { Layers3 } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
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

        <div className="mt-8 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-2xl shadow-black/20">
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
