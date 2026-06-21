"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  readonly error: Error & { digest?: string };
  readonly unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-md border border-border bg-card p-6 text-card-foreground">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <div className="min-w-0 space-y-2">
            <h1 className="text-base font-semibold">Dashboard unavailable</h1>
            <p className="text-sm text-muted-foreground">
              The dashboard could not load. Try again, or check the server logs
              if this keeps happening.
            </p>
            {error.digest && (
              <p className="truncate text-xs text-muted-foreground">
                Error reference: {error.digest}
              </p>
            )}
          </div>
        </div>

        <Button className="mt-5" onClick={() => unstable_retry()} type="button">
          <RefreshCw data-icon="inline-start" />
          Retry
        </Button>
      </section>
    </main>
  );
}
