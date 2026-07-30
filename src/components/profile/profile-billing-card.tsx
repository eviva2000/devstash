"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createBillingPortalSession,
  createCheckoutSession,
  reconcileBillingPortal,
  reconcileCheckoutSession,
} from "@/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BillingState = {
  plan: "FREE" | "PRO";
  status: "INACTIVE" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  interval: "monthly" | "yearly" | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canManageBilling: boolean;
  hasActivePro: boolean;
  itemUsage: {
    used: number;
    limit: number | null;
  };
  collectionUsage: {
    used: number;
    limit: number | null;
  };
};

type BillingInterval = "monthly" | "yearly";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ProfileBillingCard({
  billing,
  checkoutState,
  initialInterval,
  portalState,
  sessionId,
}: {
  billing: BillingState;
  checkoutState?: string;
  initialInterval: BillingInterval;
  portalState?: string;
  sessionId?: string;
}) {
  const router = useRouter();
  const reconciliationStarted = useRef(false);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [feedback, setFeedback] = useState(() =>
    getInitialFeedback(checkoutState, portalState)
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (
      checkoutState !== "success" ||
      !sessionId ||
      reconciliationStarted.current
    ) {
      return;
    }

    reconciliationStarted.current = true;
    setFeedback("Confirming your subscription…");
    startTransition(async () => {
      const result = await reconcileCheckoutSession({ sessionId });

      if (result.success) {
        setFeedback("Your subscription is active and your usage has refreshed.");
        router.replace("/profile?checkout=confirmed");
        router.refresh();
        return;
      }

      setFeedback(result.error);
    });
  }, [checkoutState, router, sessionId]);

  useEffect(() => {
    const waitForCancellation = portalState === "canceled";

    if (
      (portalState !== "return" && !waitForCancellation) ||
      reconciliationStarted.current
    ) {
      return;
    }

    reconciliationStarted.current = true;
    setFeedback(
      waitForCancellation
        ? "Confirming your cancellation…"
        : "Refreshing your billing status…"
    );
    startTransition(async () => {
      const result = await reconcileBillingPortal(waitForCancellation);

      if (result.success) {
        setFeedback("Your billing status has been updated.");
        router.replace("/profile?portal=confirmed");
        router.refresh();
        return;
      }

      setFeedback(result.error);
    });
  }, [portalState, router]);

  function startCheckout(selectedInterval: BillingInterval) {
    setFeedback("");
    startTransition(async () => {
      const result = await createCheckoutSession({
        interval: selectedInterval,
        attemptId: crypto.randomUUID(),
      });
      setFeedback(result.error);
    });
  }

  function openPortal() {
    setFeedback("");
    startTransition(async () => {
      const result = await createBillingPortalSession();
      setFeedback(result.error);
    });
  }

  const status = getStatusLabel(billing);
  const periodLabel = billing.cancelAtPeriodEnd ? "Access ends" : "Renews";
  const canCancelSubscription =
    billing.canManageBilling &&
    !billing.cancelAtPeriodEnd &&
    (billing.status === "ACTIVE" || billing.status === "PAST_DUE");

  return (
    <section
      aria-labelledby="billing-heading"
      className="rounded-md border border-border bg-card p-5 text-card-foreground"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
              <CreditCard className="size-4" />
            </span>
            <div>
              <h2
                className="text-base font-semibold tracking-normal"
                id="billing-heading"
              >
                Billing and usage
              </h2>
              <p className="text-sm text-muted-foreground">
                Your plan is based on verified Stripe subscription state.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={billing.hasActivePro ? "default" : "outline"}>
            {billing.plan === "PRO" ? "Pro" : "Free"}
          </Badge>
          <Badge variant="outline">{status}</Badge>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <UsageMeter
          label="Items"
          limit={billing.itemUsage.limit}
          used={billing.itemUsage.used}
        />
        <UsageMeter
          label="Collections"
          limit={billing.collectionUsage.limit}
          used={billing.collectionUsage.used}
        />
      </div>

      {billing.currentPeriodEnd && (
        <p className="mt-4 text-sm text-muted-foreground">
          {periodLabel} {dateFormatter.format(new Date(billing.currentPeriodEnd))}
          {billing.interval ? ` · ${capitalize(billing.interval)} billing` : ""}
        </p>
      )}

      {!billing.hasActivePro && billing.status !== "PAST_DUE" && (
        <div className="mt-5 rounded-md border border-border bg-background p-4">
          <div
            aria-label="Choose billing interval"
            className="mb-4 flex w-fit gap-1 rounded-md bg-muted p-1"
            role="group"
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                aria-pressed={interval === value}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground",
                  interval === value && "bg-background text-foreground shadow-sm"
                )}
                disabled={isPending}
                key={value}
                onClick={() => setInterval(value)}
                type="button"
              >
                {capitalize(value)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {interval === "monthly" ? "€8 / month" : "€72 / year"}
              </p>
              <p className="text-sm text-muted-foreground">
                {interval === "yearly"
                  ? "Save €24 each year (25%)."
                  : "Flexible monthly billing."}
              </p>
            </div>
            <Button
              disabled={isPending}
              onClick={() => startCheckout(interval)}
              type="button"
            >
              <Sparkles data-icon="inline-start" />
              {isPending ? "Opening…" : "Upgrade to Pro"}
            </Button>
          </div>
        </div>
      )}

      {canCancelSubscription && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={isPending}
            onClick={openPortal}
            type="button"
            variant={billing.status === "PAST_DUE" ? "default" : "outline"}
          >
            Cancel subscription
          </Button>
          {billing.status === "PAST_DUE" && (
            <p className="text-sm text-destructive">
              Pro features are paused until payment recovers.
            </p>
          )}
        </div>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className="mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
          role="status"
        >
          {feedback}
        </p>
      )}
    </section>
  );
}

function UsageMeter({
  label,
  limit,
  used,
}: {
  label: string;
  limit: number | null;
  used: number;
}) {
  const maximum = limit ?? Math.max(used, 1);
  const percentage = Math.min(100, Math.round((used / maximum) * 100));

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {limit === null ? `${used} · Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      <div
        aria-label={`${label}: ${limit === null ? `${used}, unlimited` : `${used} of ${limit}`}`}
        aria-valuemax={limit ?? undefined}
        aria-valuemin={0}
        aria-valuenow={used}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${limit === null ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
}

function getStatusLabel(billing: BillingState) {
  if (billing.cancelAtPeriodEnd && billing.hasActivePro) {
    return "Canceling";
  }

  switch (billing.status) {
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Past due";
    case "CANCELED":
      return "Canceled";
    default:
      return "No subscription";
  }
}

function getInitialFeedback(checkoutState?: string, portalState?: string) {
  if (portalState === "confirmed") {
    return "Your billing status has been updated.";
  }

  switch (checkoutState) {
    case "canceled":
      return "Checkout was canceled. No changes were made.";
    case "confirmed":
      return "Your subscription is active.";
    case "success":
      return "Confirming your subscription…";
    case "confirmed":
      return "Your billing status has been updated.";
    default:
      return "";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
