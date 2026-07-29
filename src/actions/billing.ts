"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";
import {
  billingIntervalSchema,
  getConfiguredAppOrigin,
  getPriceId,
} from "@/lib/stripe/config";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { syncStripeSubscription } from "@/lib/stripe/sync-subscription";

type BillingActionFailure = {
  success: false;
  code:
    | "UNAUTHENTICATED"
    | "INVALID_INPUT"
    | "SUBSCRIPTION_EXISTS"
    | "CUSTOMER_MISSING"
    | "OWNERSHIP_MISMATCH"
    | "UNAVAILABLE";
  error: string;
};

type ReconcileCheckoutResult =
  | { success: true }
  | BillingActionFailure;

type ReconcilePortalResult =
  | { success: true }
  | BillingActionFailure;

const checkoutSchema = z
  .object({
    interval: billingIntervalSchema,
    attemptId: z.uuid(),
  })
  .strict();

const reconcileSchema = z
  .object({
    sessionId: z.string().trim().startsWith("cs_").max(255),
  })
  .strict();

class ExistingStripeSubscriptionError extends Error {
  constructor() {
    super("A live Stripe subscription already exists.");
    this.name = "ExistingStripeSubscriptionError";
  }
}

export async function createCheckoutSession(
  input: unknown
): Promise<BillingActionFailure | never> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      code: "UNAUTHENTICATED",
      error: "Sign in before starting Checkout.",
    };
  }

  const parsed = checkoutSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      code: "INVALID_INPUT",
      error: "Choose a valid billing interval and try again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
    },
  });

  if (
    user?.stripeSubscriptionId &&
    isLiveStripeStatus(user.stripeSubscriptionStatus)
  ) {
    return {
      success: false,
      code: "SUBSCRIPTION_EXISTS",
      error: "You already have a subscription. Manage it from your profile.",
    };
  }

  let checkoutUrl: string;

  try {
    const customerId = await getOrCreateStripeCustomer(session.user.id);
    const origin = getConfiguredAppOrigin();
    const checkout = await createOrReuseCheckoutSession({
      userId: session.user.id,
      customerId,
      interval: parsed.data.interval,
      attemptId: parsed.data.attemptId,
      origin,
    });

    if (!checkout.url) {
      throw new Error("Stripe Checkout returned no hosted URL.");
    }

    checkoutUrl = checkout.url;
  } catch (error) {
    if (error instanceof ExistingStripeSubscriptionError) {
      return {
        success: false,
        code: "SUBSCRIPTION_EXISTS",
        error: "You already have a subscription. Manage it from your profile.",
      };
    }

    console.error("Unable to create Stripe Checkout Session.", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "Unknown Stripe error",
    });
    return {
      success: false,
      code: "UNAVAILABLE",
      error: "Unable to start Checkout. Try again.",
    };
  }

  redirect(checkoutUrl);
}

async function createOrReuseCheckoutSession({
  attemptId,
  customerId,
  interval,
  origin,
  userId,
}: {
  attemptId: string;
  customerId: string;
  interval: "monthly" | "yearly";
  origin: string;
  userId: string;
}) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
      const stripe = getStripeClient();
    const targetPriceId = getPriceId(interval);
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    if (
      subscriptions.data.some((subscription) =>
        isLiveStripeStatus(subscription.status)
      )
    ) {
      throw new ExistingStripeSubscriptionError();
    }

    const openSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 10,
      expand: ["data.line_items"],
    });
    const matchingSession = openSessions.data.find(
      (checkout) =>
        checkout.client_reference_id === userId &&
        checkout.mode === "subscription" &&
        checkout.line_items?.data.some(
          (lineItem) => getExpandableId(lineItem.price) === targetPriceId
        ) &&
        checkout.url
    );

    if (matchingSession) {
      return matchingSession;
    }

    const obsoleteSessions = openSessions.data.filter(
      (checkout) =>
        checkout.client_reference_id === userId &&
        checkout.mode === "subscription"
    );
    await Promise.all(
      obsoleteSessions.map((checkout) =>
        stripe.checkout.sessions.expire(checkout.id)
      )
    );

      return stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer: customerId,
          client_reference_id: userId,
          line_items: [{ price: targetPriceId, quantity: 1 }],
          metadata: {
            app_user_id: userId,
            checkout_attempt_id: attemptId,
          },
          subscription_data: {
            metadata: { app_user_id: userId },
          },
          success_url: `${origin}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/profile?checkout=canceled`,
        },
        { idempotencyKey: attemptId }
      );
    },
    {
      maxWait: 5_000,
      timeout: 15_000,
    }
  );
}

export async function createBillingPortalSession(): Promise<
  BillingActionFailure | never
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      code: "UNAUTHENTICATED",
      error: "Sign in before managing billing.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeSubscriptionStatus: true,
    },
  });

  if (
    !user?.stripeCustomerId ||
    !user.stripeSubscriptionId ||
    !isLiveStripeStatus(user.stripeSubscriptionStatus)
  ) {
    return {
      success: false,
      code: "CUSTOMER_MISSING",
      error: "No active subscription is available to manage.",
    };
  }

  let portalUrl: string;
  const returnUrl = `${getConfiguredAppOrigin()}/profile?portal=return`;
  const cancellationReturnUrl = `${getConfiguredAppOrigin()}/profile?portal=canceled`;
  const stripe = getStripeClient();

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: user.stripeSubscriptionId,
        },
        after_completion: {
          type: "redirect",
          redirect: {
            return_url: cancellationReturnUrl,
          },
        },
      },
    });
    portalUrl = portal.url;
  } catch (error) {
    // Older portal configurations can reject deep-linked cancellation flows.
    // Keep billing available by returning a standard portal session instead.
    console.warn("Unable to create direct Stripe cancellation flow; using portal.", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "Unknown Stripe error",
    });

    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });
      portalUrl = portal.url;
    } catch (fallbackError) {
      console.error("Unable to create Stripe Customer Portal Session.", {
        userId: session.user.id,
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown Stripe error",
      });
      return {
        success: false,
        code: "UNAVAILABLE",
        error: "Unable to open billing management. Try again.",
      };
    }
  }

  redirect(portalUrl);
}

/**
 * Stripe's Customer Portal does not include the subscription ID in its return
 * URL. Re-read the authenticated user's tracked subscription on return so the
 * profile reflects a cancellation even if its webhook has not arrived yet.
 */
export async function reconcileBillingPortal(
  waitForCancellation = false
): Promise<ReconcilePortalResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      code: "UNAUTHENTICATED",
      error: "Sign in before confirming billing changes.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user?.stripeCustomerId || !user.stripeSubscriptionId) {
    return {
      success: false,
      code: "CUSTOMER_MISSING",
      error: "No subscription is available to refresh.",
    };
  }

  try {
    const attempts = waitForCancellation ? 3 : 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const result = await syncStripeSubscription(user.stripeSubscriptionId);
      const cancellationIsVisible =
        result.snapshot?.stripeCancelAtPeriodEnd ||
        result.snapshot?.subscriptionStatus === "CANCELED";

      if (!waitForCancellation || cancellationIsVisible || !result.snapshot) {
        break;
      }

      await delay(750);
    }
  } catch (error) {
    console.error("Unable to reconcile Stripe Customer Portal changes.", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "Unknown Stripe error",
    });
    return {
      success: false,
      code: "UNAVAILABLE",
      error: "Your billing changes are still being confirmed. Refresh in a moment.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function reconcileCheckoutSession(
  input: unknown
): Promise<ReconcileCheckoutResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      code: "UNAUTHENTICATED",
      error: "Sign in before confirming Checkout.",
    };
  }

  const parsed = reconcileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      code: "INVALID_INPUT",
      error: "The Checkout Session is invalid.",
    };
  }

  try {
    const checkout = await getStripeClient().checkout.sessions.retrieve(
      parsed.data.sessionId,
      { expand: ["subscription"] }
    );
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });
    const customerId = getExpandableId(checkout.customer);

    if (
      checkout.client_reference_id !== session.user.id ||
      checkout.metadata?.app_user_id !== session.user.id ||
      !user?.stripeCustomerId ||
      customerId !== user.stripeCustomerId
    ) {
      return {
        success: false,
        code: "OWNERSHIP_MISMATCH",
        error: "This Checkout Session does not belong to your account.",
      };
    }

    const subscriptionId = getExpandableId(checkout.subscription);

    if (!subscriptionId || checkout.mode !== "subscription") {
      return {
        success: false,
        code: "INVALID_INPUT",
        error: "Checkout has not created a subscription.",
      };
    }

    await syncStripeSubscription(subscriptionId);
  } catch (error) {
    console.error("Unable to reconcile Stripe Checkout Session.", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : "Unknown Stripe error",
    });
    return {
      success: false,
      code: "UNAVAILABLE",
      error: "Checkout is still being confirmed. Refresh in a moment.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

function isLiveStripeStatus(status: string | null): boolean {
  return (
    status !== null &&
    !["canceled", "incomplete_expired"].includes(status)
  );
}

function getExpandableId(
  value: string | { id: string } | null
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}
