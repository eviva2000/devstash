import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import {
  syncStripeSubscription,
  type StripeEventContext,
  type SubscriptionSyncResult,
} from "@/lib/stripe/sync-subscription";

export type StripeEventProcessResult =
  | SubscriptionSyncResult
  | { outcome: "unsupported"; userId: null };

export async function processStripeEvent(
  event: Stripe.Event
): Promise<StripeEventProcessResult> {
  const context = getEventContext(event);
  let result: StripeEventProcessResult;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = getExpandableId(session.subscription);

      if (!subscriptionId) {
        throw new Error("Completed Checkout Session has no subscription.");
      }

      await repairCheckoutCustomerMapping(session);
      result = await syncStripeSubscription(subscriptionId, context);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      result = await syncStripeSubscription(event.data.object.id, context);
      break;
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscriptionId = getInvoiceSubscriptionId(event.data.object);

      if (!subscriptionId) {
        result = { outcome: "unsupported", userId: null };
        break;
      }

      result = await syncStripeSubscription(subscriptionId, context);
      break;
    }
    default:
      result = { outcome: "unsupported", userId: null };
  }

  console.info("Processed Stripe event.", {
    eventId: event.id,
    eventType: event.type,
    objectId: context.objectId,
    userId: result.userId,
    outcome: result.outcome,
  });

  return result;
}

function getEventContext(event: Stripe.Event): StripeEventContext {
  const object = event.data.object;

  return {
    id: event.id,
    type: event.type,
    created: event.created,
    objectId:
      typeof object === "object" && object && "id" in object
        ? String(object.id)
        : null,
  };
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  return getExpandableId(subscription);
}

function getExpandableId(
  value: string | { id: string } | null | undefined
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function repairCheckoutCustomerMapping(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.app_user_id;
  const customerId = getExpandableId(session.customer);

  if (!userId || !customerId) {
    return;
  }

  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ stripeCustomerId: null }, { stripeCustomerId: customerId }],
    },
    data: {
      stripeCustomerId: customerId,
    },
  });
}
