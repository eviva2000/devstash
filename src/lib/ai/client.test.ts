import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("OpenAI client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("fails clearly when the server API key is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { getOpenAIClient } = await import("./client");

    expect(() => getOpenAIClient()).toThrow(
      "OPENAI_API_KEY is not configured."
    );
  });

  test("creates one reusable server client with the configured model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    const { AI_MODEL, getOpenAIClient } = await import("./client");

    const firstClient = getOpenAIClient();
    const secondClient = getOpenAIClient();

    expect(AI_MODEL).toBe("gpt-5-nano");
    expect(secondClient).toBe(firstClient);
  });
});
