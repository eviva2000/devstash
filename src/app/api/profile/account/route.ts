import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
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
    user.stripeSubscriptionStatus !== "canceled" &&
    user.stripeSubscriptionStatus !== "incomplete_expired"
  ) {
    try {
      await getStripeClient().subscriptions.cancel(user.stripeSubscriptionId);
    } catch (error) {
      console.error("Failed to cancel Stripe subscription before account deletion.", {
        userId: session.user.id,
        subscriptionId: user.stripeSubscriptionId,
        error: error instanceof Error ? error.message : "Unknown Stripe error",
      });
      return Response.json(
        {
          error:
            "Your subscription could not be canceled, so your account was kept. Try again.",
        },
        { status: 502 }
      );
    }
  }

  await prisma.user.deleteMany({ where: { id: session.user.id } });

  return Response.json({ ok: true });
}
