"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState, useTransition } from "react";

import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/actions/billing";
import { Wordmark } from "@/components/homepage/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ProOnlyItemTypeSlug } from "@/lib/item-type-capabilities";
import { cn, getActionErrorMessage } from "@/lib/utils";

type BillingStatus = "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";

const benefits = [
  "Secure file and image uploads",
  "Unlimited items and collections",
  "AI-generated tags and descriptions",
  "All your developer resources in one place",
];

export function ItemTypeUpgradePage({
  billingStatus,
  itemTypeSlug,
}: {
  billingStatus: BillingStatus;
  itemTypeSlug: ProOnlyItemTypeSlug;
}) {
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const isPastDue = billingStatus === "PAST_DUE";
  const isImage = itemTypeSlug === "image";
  const ItemTypeIcon = isImage ? ImageIcon : FileText;
  const itemTypeLabel = isImage ? "images" : "files";

  function startCheckout(interval: "monthly" | "yearly") {
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await createCheckoutSession({
          interval,
          attemptId: crypto.randomUUID(),
        });
        setFeedback(result.error);
      } catch (error) {
        setFeedback(
          getActionErrorMessage(error, "Unable to start Checkout. Try again.")
        );
      }
    });
  }

  function openBillingPortal() {
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await createBillingPortalSession();
        setFeedback(result.error);
      } catch (error) {
        setFeedback(
          getActionErrorMessage(error, "Unable to open billing. Try again.")
        );
      }
    });
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 text-foreground/[0.035] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-56 top-20 -z-10 size-[34rem] rounded-full bg-indigo-500/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-1/3 -z-10 size-[30rem] rounded-full bg-sky-500/10 blur-3xl"
      />

      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4">
        <Link aria-label="DevStash home" href="/">
          <Wordmark className="text-lg" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/dashboard"
          >
            <ArrowLeft data-icon="inline-start" />
            Dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1040px] items-center py-10 sm:py-14">
        <div className="grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-indigo-950/10 lg:grid-cols-[1.05fr_.95fr] dark:shadow-black/30">
          <div className="relative overflow-hidden p-6 sm:p-9 lg:p-11">
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 size-64 rounded-full bg-indigo-500/10 blur-3xl"
            />
            <div className="relative">
              <Badge className="border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200">
                <Sparkles />
                Pro feature
              </Badge>

              <span className="mt-7 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
                <ItemTypeIcon className="size-7" />
              </span>

              <h1 className="mt-6 max-w-xl text-balance text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
                {isPastDue
                  ? `Restore access to your ${itemTypeLabel}`
                  : `Unlock your ${itemTypeLabel} library`}
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
                {isPastDue
                  ? `Your Pro features are paused while billing is past due. Update your payment method to regain access to ${itemTypeLabel}.`
                  : `File and image libraries are included with DevStash Pro. Upgrade to upload, organize, and revisit every resource alongside your code and notes.`}
              </p>

              <ul className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li className="flex items-start gap-2.5" key={benefit}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                      <Check className="size-3.5" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-border bg-muted/25 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
            {isPastDue ? (
              <div className="flex h-full flex-col justify-center">
                <p className="text-sm font-semibold text-destructive">
                  Payment action needed
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Keep your Pro workspace active
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Stripe securely manages your payment details. Your existing
                  content remains stored while access is paused.
                </p>
                <Button
                  className="mt-6 h-10"
                  disabled={isPending}
                  onClick={openBillingPortal}
                  size="lg"
                  type="button"
                >
                  {isPending && <Loader2 className="animate-spin" />}
                  {isPending ? "Opening billing…" : "Update payment method"}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  Choose your plan
                </p>
                <div className="mt-4 grid gap-3">
                  <PlanOption
                    description="Flexible monthly billing"
                    disabled={isPending}
                    label="Monthly"
                    onSelect={() => startCheckout("monthly")}
                    price="€8"
                    suffix="/ month"
                  />
                  <PlanOption
                    badge="Save 25%"
                    description="€24 less than paying monthly"
                    disabled={isPending}
                    label="Yearly"
                    onSelect={() => startCheckout("yearly")}
                    price="€72"
                    recommended
                    suffix="/ year"
                  />
                </div>
                <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                  Checkout and payment details are securely handled by Stripe.
                </p>
              </div>
            )}

            {feedback && (
              <p
                aria-live="polite"
                className="mt-5 rounded-md border border-border bg-background px-3 py-2 text-sm"
                role="status"
              >
                {feedback}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function PlanOption({
  badge,
  description,
  disabled,
  label,
  onSelect,
  price,
  recommended = false,
  suffix,
}: {
  badge?: string;
  description: string;
  disabled: boolean;
  label: string;
  onSelect: () => void;
  price: string;
  recommended?: boolean;
  suffix: string;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border bg-background p-4",
        recommended
          ? "border-indigo-500/60 shadow-sm shadow-indigo-500/10"
          : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {badge && (
          <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
            {badge}
          </Badge>
        )}
      </div>
      <p className="mt-4">
        <span className="text-3xl font-bold tracking-tight">{price}</span>
        <span className="ml-1 text-sm text-muted-foreground">{suffix}</span>
      </p>
      <Button
        className={cn(
          "mt-4 h-9 w-full",
          recommended &&
            "bg-indigo-500 text-white hover:bg-indigo-400"
        )}
        disabled={disabled}
        onClick={onSelect}
        type="button"
        variant={recommended ? "default" : "outline"}
      >
        {disabled && <Loader2 className="animate-spin" />}
        Upgrade {label.toLowerCase()}
      </Button>
    </article>
  );
}
