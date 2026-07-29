import { getStripeClient } from "@/lib/stripe/client";
import { getStripeWebhookSecret } from "@/lib/stripe/config";
import { processStripeEvent } from "@/lib/stripe/process-event";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  let event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch {
    return Response.json(
      { error: "Invalid Stripe signature." },
      { status: 400 }
    );
  }

  try {
    await processStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed.", {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "Unknown processing error",
    });
    return Response.json(
      { error: "Stripe event processing failed." },
      { status: 500 }
    );
  }
}
