import "server-only";

import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/stripe/config";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  stripeClient ??= new Stripe(getStripeSecretKey());
  return stripeClient;
}
