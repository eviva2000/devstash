"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { createCheckoutSession } from "@/actions/billing";
import { Wordmark } from "@/components/homepage/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "yearly";

const proBenefits = [
  "Unlimited items & collections",
  "AI-generated tags & summaries",
  "Semantic AI search",
  "File and image uploads",
  "Priority support",
];

export function UpgradePlans() {
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function startCheckout() {
    setFeedback("");
    startTransition(async () => {
      const result = await createCheckoutSession({
        interval,
        attemptId: crypto.randomUUID(),
      });
      setFeedback(result.error);
    });
  }

  const price = interval === "yearly" ? "72" : "8";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[min(1180px,calc(100%-2rem))] items-center justify-between">
          <Link aria-label="DevStash home" href="/dashboard">
            <Wordmark className="text-lg text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden px-4 py-14 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-0 -z-10 size-[34rem] rounded-full bg-indigo-500/12 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-24 -z-10 size-[30rem] rounded-full bg-violet-500/12 blur-3xl" />

        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">DevStash Pro</p>
          <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.055em] sm:text-5xl">Make your knowledge a superpower.</h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground">Unlock more space for your stash and AI features that help you find the useful thing faster.</p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="mx-auto mb-6 flex w-fit gap-1 rounded-xl border border-border bg-muted/50 p-1" role="group" aria-label="Billing period">
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                aria-pressed={interval === value}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors", interval === value && "bg-background text-foreground shadow-sm")}
                disabled={isPending}
                key={value}
                onClick={() => setInterval(value)}
                type="button"
              >
                {value === "monthly" ? "Monthly" : <>Yearly <span className="ml-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">Save 25%</span></>}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              description="Flexible monthly billing. Cancel anytime."
              interval="monthly"
              isSelected={interval === "monthly"}
              onSelect={() => setInterval("monthly")}
              price="8"
            />
            <PlanCard
              badge="Best value"
              description="Save €24 each year compared with monthly billing."
              interval="yearly"
              isSelected={interval === "yearly"}
              onSelect={() => setInterval("yearly")}
              price="72"
            />
          </div>

          <Button className="mt-5 h-11 w-full bg-indigo-500 text-white hover:bg-indigo-400" disabled={isPending} onClick={startCheckout} size="lg" type="button">
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? "Opening checkout…" : `Upgrade for €${price}${interval === "yearly" ? "/year" : "/month"}`}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Checkout and payment details are securely handled by Stripe.</p>

          {feedback && <p aria-live="polite" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="status">{feedback}</p>}
        </div>
      </section>
    </main>
  );
}

function PlanCard({
  badge,
  description,
  interval,
  isSelected,
  onSelect,
  price,
}: {
  badge?: string;
  description: string;
  interval: BillingInterval;
  isSelected: boolean;
  onSelect: () => void;
  price: string;
}) {
  const label = interval === "monthly" ? "Monthly" : "Yearly";

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "relative rounded-2xl border bg-card p-6 text-left text-card-foreground transition-colors hover:border-indigo-400/65 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isSelected
          ? "border-indigo-400 bg-indigo-500/5 shadow-lg shadow-indigo-500/10"
          : "border-border"
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-tight">{label}</p>
          <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
        {badge && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{badge}</span>}
      </div>
      <p className="mt-6 flex items-start"><span className="mt-1 text-lg">€</span><span className="text-4xl font-extrabold tracking-tighter">{price}</span><span className="mt-auto mb-1 ml-1 text-sm text-muted-foreground">{interval === "yearly" ? "/ year" : "/ month"}</span></p>
      <span className={cn("mt-5 inline-flex rounded-md border px-2.5 py-1.5 text-xs font-semibold", isSelected ? "border-indigo-400/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200" : "border-border text-muted-foreground")}>{isSelected ? "Selected" : `Select ${label.toLowerCase()}`}</span>
      <div className="my-6 h-px bg-border" />
      <p className="mb-4 text-xs font-semibold text-foreground">Everything in Free, plus:</p>
      <ul className="space-y-3 text-sm text-muted-foreground">
        {proBenefits.map((benefit, index) => (
          <li className="flex gap-2" key={benefit}>
            {index === 1 || index === 2 ? <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-500" /> : <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />}
            {benefit}
          </li>
        ))}
      </ul>
    </button>
  );
}
