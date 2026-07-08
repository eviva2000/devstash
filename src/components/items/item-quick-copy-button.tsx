"use client";

import { Check, Copy } from "lucide-react";
import { useState, type MouseEvent } from "react";

import type { DashboardItem } from "@/features/dashboard/dashboard-types";

export function ItemQuickCopyButton({ item }: { item: DashboardItem }) {
  const [hasCopied, setHasCopied] = useState(false);
  const copyValue = getItemCopyValue(item);

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (!copyValue) {
      return;
    }

    await navigator.clipboard.writeText(copyValue);
    setHasCopied(true);
    window.setTimeout(() => setHasCopied(false), 1400);
  }

  return (
    <button
      aria-label={`Copy ${item.title}`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      disabled={!copyValue}
      onClick={handleCopy}
      title={hasCopied ? "Copied" : "Copy"}
      type="button"
    >
      {hasCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  );
}

function getItemCopyValue(item: DashboardItem) {
  return (
    item.content ??
    item.url ??
    item.fileName ??
    item.description ??
    item.title ??
    ""
  );
}
