import "server-only";

import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";

export class StripeCustomerUserNotFoundError extends Error {
  constructor() {
    super("The authenticated user no longer exists.");
    this.name = "StripeCustomerUserNotFoundError";
  }
}

/**
 * Returns the Stripe Customer that is permanently associated with an app user.
 *
 * The conditional database update makes concurrent calls safe. When another
 * request wins the race, the extra Customer is deleted and its ID is logged so
 * an unsuccessful cleanup can be reconciled instead of becoming a silent
 * orphan.
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new StripeCustomerUserNotFoundError();
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: {
      app_user_id: user.id,
    },
  });
  const claimed = await prisma.user.updateMany({
    where: {
      id: user.id,
      stripeCustomerId: null,
    },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  if (claimed.count === 1) {
    return customer.id;
  }

  const winner = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  if (!winner?.stripeCustomerId) {
    console.error("Stripe Customer claim failed without a winning Customer.", {
      userId: user.id,
      orphanedCustomerId: customer.id,
    });
    throw new Error("Unable to associate a Stripe Customer with the user.");
  }

  try {
    await stripe.customers.del(customer.id);
    console.info("Removed a Stripe Customer created during a concurrent race.", {
      userId: user.id,
      orphanedCustomerId: customer.id,
      retainedCustomerId: winner.stripeCustomerId,
    });
  } catch (error) {
    console.error("Failed to remove an orphaned Stripe Customer.", {
      userId: user.id,
      orphanedCustomerId: customer.id,
      retainedCustomerId: winner.stripeCustomerId,
      error: error instanceof Error ? error.message : "Unknown Stripe error",
    });
  }

  return winner.stripeCustomerId;
}
