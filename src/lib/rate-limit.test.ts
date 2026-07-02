import { describe, expect, test } from "vitest";

import { getClientIp, tooManyRequestsResponse } from "./rate-limit";

describe("getClientIp", () => {
  test("uses the first forwarded IP when available", () => {
    const request = new Request("https://devstash.test", {
      headers: {
        "x-forwarded-for": "203.0.113.7, 198.51.100.12",
        "x-real-ip": "198.51.100.20",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.7");
  });

  test("falls back to x-real-ip and then unknown", () => {
    expect(
      getClientIp(
        new Request("https://devstash.test", {
          headers: { "x-real-ip": "198.51.100.20" },
        })
      )
    ).toBe("198.51.100.20");

    expect(getClientIp(new Request("https://devstash.test"))).toBe("unknown");
  });
});

describe("tooManyRequestsResponse", () => {
  test("returns a 429 response with retry metadata", async () => {
    const response = tooManyRequestsResponse(Date.now() + 61_000);

    await expect(response.json()).resolves.toEqual({
      error: "Too many attempts. Please try again in 2 minutes.",
    });
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(
      61
    );
  });
});
