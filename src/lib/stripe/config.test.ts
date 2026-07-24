import { afterEach, describe, expect, test, vi } from "vitest";

import {
  getConfiguredAppOrigin,
  getPriceId,
  getStripeSecretKey,
  getStripeWebhookSecret,
} from "./config";

vi.mock("server-only", () => ({}));

describe("Stripe configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("maps trusted billing intervals to configured Price IDs", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly");

    expect(getPriceId("monthly")).toBe("price_monthly");
    expect(getPriceId("yearly")).toBe("price_yearly");
  });

  test("rejects unknown intervals and malformed Price IDs", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "monthly-price");

    expect(() => getPriceId("weekly")).toThrow(
      "Billing interval is invalid."
    );
    expect(() => getPriceId("monthly")).toThrow(
      "STRIPE_PRICE_ID_MONTHLY is missing or invalid."
    );
  });

  test("validates and normalizes the configured application origin", () => {
    vi.stubEnv("APP_URL", "https://devstash.example/profile");

    expect(getConfiguredAppOrigin()).toBe("https://devstash.example");

    vi.stubEnv("APP_URL", "not-a-url");
    expect(() => getConfiguredAppOrigin()).toThrow(
      "APP_URL is missing or invalid."
    );

    vi.stubEnv("APP_URL", "mailto:billing@devstash.example");
    expect(() => getConfiguredAppOrigin()).toThrow(
      "APP_URL is missing or invalid."
    );
  });

  test("validates server and webhook secrets independently", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_phase_one");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_phase_one");

    expect(getStripeSecretKey()).toBe("sk_test_phase_one");
    expect(getStripeWebhookSecret()).toBe("whsec_phase_one");

    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(() => getStripeSecretKey()).toThrow(
      "STRIPE_SECRET_KEY is missing or invalid."
    );
    expect(getStripeWebhookSecret()).toBe("whsec_phase_one");
  });

  test("does not require the webhook secret for Checkout configuration", () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

    expect(getConfiguredAppOrigin()).toBe("http://localhost:3000");
    expect(getPriceId("monthly")).toBe("price_monthly");
  });

  test("rejects empty prefixed configuration values", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_");

    expect(() => getStripeSecretKey()).toThrow(
      "STRIPE_SECRET_KEY is missing or invalid."
    );
    expect(() => getStripeWebhookSecret()).toThrow(
      "STRIPE_WEBHOOK_SECRET is missing or invalid."
    );
    expect(() => getPriceId("yearly")).toThrow(
      "STRIPE_PRICE_ID_YEARLY is missing or invalid."
    );
  });
});
