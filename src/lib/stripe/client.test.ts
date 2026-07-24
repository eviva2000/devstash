import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));

describe("Stripe client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("is lazy and fails clearly when the server secret is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const { getStripeClient } = await import("./client");

    expect(() => getStripeClient()).toThrow(
      "STRIPE_SECRET_KEY is missing or invalid."
    );
  });

  test("creates one reusable server client", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_phase_one");

    const { getStripeClient } = await import("./client");
    const firstClient = getStripeClient();
    const secondClient = getStripeClient();

    expect(secondClient).toBe(firstClient);
    expect(firstClient.getApiField("version")).toBe(Stripe.API_VERSION);
  });
});
