import Stripe from "stripe";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { processStripeEvent } from "@/lib/stripe/process-event";

import { POST } from "./route";

const fixtureStripe = new Stripe("sk_test_fixture");
const webhookSecret = "whsec_test_fixture";

vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: () => fixtureStripe,
}));
vi.mock("@/lib/stripe/config", () => ({
  getStripeWebhookSecret: () => webhookSecret,
}));
vi.mock("@/lib/stripe/process-event", () => ({
  processStripeEvent: vi.fn(),
}));

const processStripeEventMock = vi.mocked(processStripeEvent);

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processStripeEventMock.mockResolvedValue({
      outcome: "unsupported",
      userId: null,
    });
  });

  test("rejects a missing signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: eventPayload(),
      })
    );

    expect(response.status).toBe(400);
    expect(processStripeEventMock).not.toHaveBeenCalled();
  });

  test("rejects an invalid signature", async () => {
    const response = await POST(signedRequest("invalid"));

    expect(response.status).toBe(400);
    expect(processStripeEventMock).not.toHaveBeenCalled();
  });

  test("verifies the exact raw body and durably processes the event", async () => {
    const payload = eventPayload();
    const signature = fixtureStripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const response = await POST(signedRequest(signature, payload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(processStripeEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "evt_fixture",
        type: "customer.subscription.updated",
      })
    );
  });

  test("returns 500 so Stripe retries provider or database failures", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    processStripeEventMock.mockRejectedValue(new Error("database unavailable"));
    const payload = eventPayload();
    const signature = fixtureStripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const response = await POST(signedRequest(signature, payload));

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith(
      "Stripe webhook processing failed.",
      expect.objectContaining({ eventId: "evt_fixture" })
    );
  });
});

function signedRequest(signature: string, payload = eventPayload()) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": signature,
    },
    body: payload,
  });
}

function eventPayload() {
  return JSON.stringify({
    id: "evt_fixture",
    object: "event",
    api_version: "2026-06-30.basil",
    created: 1_700_000_000,
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_fixture",
        object: "subscription",
      },
    },
  });
}
