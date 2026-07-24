"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const freeBenefits = ["Up to 50 items", "3 collections", "All core item types", "Fast keyword search", "Code & markdown editors"];
const proBenefits = ["Unlimited items & collections", "AI-generated tags & summaries", "Semantic AI search", "File and image uploads", "Priority support"];

export function PricingToggle() {
  const [yearly, setYearly] = useState(true);
  const price = yearly ? "72" : "7";
  const callbackUrl = `/profile?interval=${yearly ? "yearly" : "monthly"}`;
  const proHref = `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <>
      <div className="mx-auto mb-9 flex w-fit gap-1 rounded-xl border border-border bg-muted/50 p-1" role="group" aria-label="Billing period">
        <button
          aria-pressed={!yearly}
          className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors", !yearly && "bg-background text-foreground shadow-sm")}
          onClick={() => setYearly(false)}
          type="button"
        >
          Monthly
        </button>
        <button
          aria-pressed={yearly}
          className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors", yearly && "bg-background text-foreground shadow-sm")}
          onClick={() => setYearly(true)}
          type="button"
        >
          Yearly <span className="ml-1 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">Save about 14%</span>
        </button>
      </div>

      <div className="mx-auto grid w-[min(1240px,calc(100%-2rem))] gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-7 text-card-foreground">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-muted text-sm font-bold text-foreground">D</span>
            <h3 className="text-xl font-bold tracking-tight">Free</h3>
          </div>
          <p className="mt-4 min-h-10 text-sm leading-5 text-muted-foreground">For building your first organized stash.</p>
          <p className="mt-6 flex items-start text-foreground"><span className="mt-1 text-xl">€</span><span className="text-5xl font-extrabold tracking-tighter">0</span><span className="mt-auto mb-1 ml-1 text-sm text-muted-foreground">/ forever</span></p>
          <Link className={cn(buttonVariants({ variant: "outline" }), "mt-7 w-full")} href="/register">
            Get started free
          </Link>
          <div className="my-6 h-px bg-border" />
          <p className="mb-4 text-xs font-semibold text-foreground">Everything you need to begin:</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {freeBenefits.map((benefit) => <li className="flex gap-2" key={benefit}><Check className="mt-0.5 size-4 text-emerald-400" />{benefit}</li>)}
          </ul>
        </article>

        <article className="relative rounded-2xl border border-indigo-400/65 bg-[linear-gradient(145deg,rgba(40,38,78,.92),rgba(20,24,42,.97))] p-7 text-white shadow-[0_20px_60px_rgba(79,70,229,.18)]">
          <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 px-3 py-1 text-[10px] font-bold tracking-wide text-white uppercase shadow-lg shadow-indigo-500/25">Most popular</span>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white"><Sparkles className="size-4" /></span>
            <h3 className="text-xl font-bold tracking-tight">Pro</h3>
          </div>
          <p className="mt-4 min-h-10 text-sm leading-5 text-slate-400">For developers making knowledge a superpower.</p>
          <p className="mt-6 flex items-start text-white"><span className="mt-1 text-xl">€</span><span className="text-5xl font-extrabold tracking-tighter">{price}</span><span className="mt-auto mb-1 ml-1 text-sm text-slate-400">{yearly ? "/ year" : "/ month"}</span></p>
          <p className="mt-1 h-4 text-xs text-violet-300">{yearly ? "Save €12/year (about 14%)" : "Billed monthly"}</p>
          <Link className={cn(buttonVariants(), "mt-5 w-full bg-indigo-500 text-white hover:bg-indigo-400")} href={proHref}>
            Start with Pro
          </Link>
          <div className="my-6 h-px bg-white/10" />
          <p className="mb-4 text-xs font-semibold text-slate-300">Everything in Free, plus:</p>
          <ul className="space-y-3 text-sm text-slate-300">
            {proBenefits.map((benefit, index) => <li className="flex gap-2" key={benefit}>{index === 1 || index === 2 ? <Sparkles className="mt-0.5 size-4 text-violet-300" /> : <Check className="mt-0.5 size-4 text-emerald-400" />}{benefit}</li>)}
          </ul>
        </article>
      </div>
    </>
  );
}
