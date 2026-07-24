import "server-only";

import { z } from "zod";

export const billingIntervalSchema = z.enum(["monthly", "yearly"]);

export type BillingInterval = z.infer<typeof billingIntervalSchema>;

const stripeSecretKeySchema = z
  .string()
  .trim()
  .min("sk_".length + 1)
  .startsWith("sk_");
const stripeWebhookSecretSchema = z
  .string()
  .trim()
  .min("whsec_".length + 1)
  .startsWith("whsec_");
const stripePriceIdSchema = z
  .string()
  .trim()
  .min("price_".length + 1)
  .startsWith("price_");
const appUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  })
  .transform((value) => new URL(value).origin);

function parseConfigValue(
  name: string,
  value: string | undefined,
  schema: z.ZodType<string>
): string {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`${name} is missing or invalid.`);
  }

  return parsed.data;
}

export function getStripeSecretKey(): string {
  return parseConfigValue(
    "STRIPE_SECRET_KEY",
    process.env.STRIPE_SECRET_KEY,
    stripeSecretKeySchema
  );
}

export function getStripeWebhookSecret(): string {
  return parseConfigValue(
    "STRIPE_WEBHOOK_SECRET",
    process.env.STRIPE_WEBHOOK_SECRET,
    stripeWebhookSecretSchema
  );
}

export function getConfiguredAppOrigin(): string {
  return parseConfigValue("APP_URL", process.env.APP_URL, appUrlSchema);
}

export function getPriceId(interval: unknown): string {
  const parsedInterval = billingIntervalSchema.safeParse(interval);

  if (!parsedInterval.success) {
    throw new Error("Billing interval is invalid.");
  }

  const [name, value] =
    parsedInterval.data === "monthly"
      ? ["STRIPE_PRICE_ID_MONTHLY", process.env.STRIPE_PRICE_ID_MONTHLY]
      : ["STRIPE_PRICE_ID_YEARLY", process.env.STRIPE_PRICE_ID_YEARLY];

  return parseConfigValue(name, value, stripePriceIdSchema);
}
