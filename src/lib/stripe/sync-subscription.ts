import "server-only";

import type Stripe from "stripe";

import {
  SubscriptionPlan,
  SubscriptionStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";
import {
  getPriceId,
  type BillingInterval,
} from "@/lib/stripe/config";

export type StripeEventContext = {
  id: string;
  type: string;
  created: number;
  objectId: string | null;
};

export type LocalSubscriptionSnapshot = {
  plan: (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];
  subscriptionStatus:
    (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
  stripePriceId: string | null;
  stripeSubscriptionStatus: string;
  stripeCurrentPeriodEnd: Date | null;
  stripeCancelAtPeriodEnd: boolean;
  interval: BillingInterval | null;
  grantsPro: boolean;
};

export type SubscriptionSyncResult = {
  outcome: "updated" | "duplicate" | "deleted_user" | "failed_closed";
  userId: string | null;
  snapshot?: LocalSubscriptionSnapshot;
};

export class UnsupportedStripeSubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedStripeSubscriptionError";
  }
}

export function mapStripeSubscription(
  subscription: Stripe.Subscription,
  allowedPrices: {
    monthly: string;
    yearly: string;
  }
): LocalSubscriptionSnapshot {
  const items = subscription.items.data;

  if (items.length !== 1 || !items[0]?.price.recurring) {
    throw new UnsupportedStripeSubscriptionError(
      "Expected exactly one recurring subscription item."
    );
  }

  const item = items[0];
  const interval =
    item.price.id === allowedPrices.monthly
      ? "monthly"
      : item.price.id === allowedPrices.yearly
        ? "yearly"
        : null;

  if (!interval) {
    throw new UnsupportedStripeSubscriptionError(
      "The subscription uses an unrecognized Price."
    );
  }

  const base = {
    stripePriceId: item.price.id,
    stripeSubscriptionStatus: subscription.status,
    stripeCurrentPeriodEnd: new Date(item.current_period_end * 1000),
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    interval,
  } satisfies Omit<
    LocalSubscriptionSnapshot,
    "plan" | "subscriptionStatus" | "grantsPro"
  >;

  switch (subscription.status) {
    case "active":
      return {
        ...base,
        plan: SubscriptionPlan.PRO,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        grantsPro: true,
      };
    case "past_due":
    case "unpaid":
    case "paused":
      return {
        ...base,
        plan: SubscriptionPlan.PRO,
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
        grantsPro: false,
      };
    case "canceled":
      return {
        ...base,
        plan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.CANCELED,
        grantsPro: false,
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        ...base,
        plan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.INACTIVE,
        grantsPro: false,
      };
    case "trialing":
      throw new UnsupportedStripeSubscriptionError(
        "Trials are not supported in this release."
      );
    default:
      throw new UnsupportedStripeSubscriptionError(
        `Unsupported Stripe subscription status: ${subscription.status}`
      );
  }
}

export async function syncStripeSubscription(
  subscriptionId: string,
  event?: StripeEventContext
): Promise<SubscriptionSyncResult> {
  if (event) {
    const existingEvent = await prisma.stripeWebhookEvent.findUnique({
      where: { id: event.id },
      select: { id: true },
    });

    if (existingEvent) {
      return { outcome: "duplicate", userId: null };
    }
  }

  const stripe = getStripeClient();
  const initialSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const initialCustomerId = getExpandableId(initialSubscription.customer);
  const metadataUserId = initialSubscription.metadata.app_user_id;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: initialSubscription.id },
        { stripeCustomerId: initialCustomerId },
        ...(metadataUserId ? [{ id: metadataUserId }] : []),
      ],
    },
    select: {
      id: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    if (event) {
      const inserted = await recordEventWithoutUser(event);
      return {
        outcome: inserted ? "deleted_user" : "duplicate",
        userId: null,
      };
    }

    throw new Error("No DevStash user owns this Stripe subscription.");
  }

  return prisma.$transaction(
    async (tx) => {
      await lockBillingUser(tx, user.id);
    const lockedUser = await tx.user.findUnique({
      where: { id: user.id },
      select: {
        stripeCustomerId: true,
        stripeLastEventCreatedAt: true,
      },
    });

    if (!lockedUser) {
      throw new Error("The DevStash user was deleted during synchronization.");
    }

    if (event) {
      const duplicate = await tx.stripeWebhookEvent.findUnique({
        where: { id: event.id },
        select: { id: true },
      });

      if (duplicate) {
        return { outcome: "duplicate", userId: user.id };
      }
    }

    // Retrieve again after taking the per-user database lock. This makes the
    // provider's latest state—not webhook delivery order—the final authority.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const customerId = getExpandableId(subscription.customer);

    if (
      lockedUser.stripeCustomerId &&
      customerId !== lockedUser.stripeCustomerId
    ) {
      throw new Error("The Stripe subscription belongs to a different Customer.");
    }

    let outcome: SubscriptionSyncResult["outcome"] = "updated";
    let snapshot: LocalSubscriptionSnapshot;

    try {
      snapshot = mapStripeSubscription(subscription, {
        monthly: getPriceId("monthly"),
        yearly: getPriceId("yearly"),
      });
    } catch (error) {
      if (!(error instanceof UnsupportedStripeSubscriptionError)) {
        throw error;
      }

      outcome = "failed_closed";
      snapshot = getFailClosedSnapshot(subscription);
    }

    if (event) {
      await tx.stripeWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          objectId: event.objectId,
          stripeCreatedAt: new Date(event.created * 1000),
        },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        plan: snapshot.plan,
        subscriptionStatus: snapshot.subscriptionStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: snapshot.stripePriceId,
        stripeSubscriptionStatus: snapshot.stripeSubscriptionStatus,
        stripeCurrentPeriodEnd: snapshot.stripeCurrentPeriodEnd,
        stripeCancelAtPeriodEnd: snapshot.stripeCancelAtPeriodEnd,
        ...(event
          ? {
              stripeLastEventCreatedAt: getLatestEventDate(
                lockedUser.stripeLastEventCreatedAt,
                event.created
              ),
            }
          : {}),
      },
    });

      return {
        outcome,
        userId: user.id,
        snapshot,
      };
    },
    {
      maxWait: 5_000,
      timeout: 15_000,
    }
  );
}

function getFailClosedSnapshot(
  subscription: Stripe.Subscription
): LocalSubscriptionSnapshot {
  const singleItem =
    subscription.items.data.length === 1
      ? subscription.items.data[0]
      : undefined;

  return {
    plan: SubscriptionPlan.FREE,
    subscriptionStatus:
      subscription.status === "canceled"
        ? SubscriptionStatus.CANCELED
        : SubscriptionStatus.INACTIVE,
    stripePriceId: singleItem?.price.id ?? null,
    stripeSubscriptionStatus: subscription.status,
    stripeCurrentPeriodEnd: singleItem
      ? new Date(singleItem.current_period_end * 1000)
      : null,
    stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
    interval: null,
    grantsPro: false,
  };
}

function getExpandableId(
  value: string | { id: string }
): string {
  return typeof value === "string" ? value : value.id;
}

async function lockBillingUser(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}

async function recordEventWithoutUser(
  event: StripeEventContext
): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        objectId: event.objectId,
        stripeCreatedAt: new Date(event.created * 1000),
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }
    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function getLatestEventDate(
  current: Date | null,
  eventCreated: number
): Date {
  const eventDate = new Date(eventCreated * 1000);
  return current && current > eventDate ? current : eventDate;
}
