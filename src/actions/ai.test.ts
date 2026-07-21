import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import { isProUser } from "@/lib/ai/access";
import { getOpenAIClient } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/rate-limit";

import { generateAutoTags } from "./ai";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/ai/access", () => ({ isProUser: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({
  AI_MODEL: "gpt-5-nano",
  getOpenAIClient: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));

type AuthSession = Session | null;

const authMock = vi.mocked(auth) as unknown as Mock<() => Promise<AuthSession>>;
const checkRateLimitMock = vi.mocked(checkRateLimit);
const getOpenAIClientMock = vi.mocked(getOpenAIClient);
const isProUserMock = vi.mocked(isProUser);
const responsesCreateMock = vi.fn();

describe("generateAutoTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(sessionForUser("user-1"));
    isProUserMock.mockResolvedValue(true);
    checkRateLimitMock.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: Date.now() + 60 * 60 * 1000,
    });
    getOpenAIClientMock.mockReturnValue({
      responses: { create: responsesCreateMock },
    } as never);
    responsesCreateMock.mockResolvedValue({
      output_text: '{"tags":["TypeScript","Next.js","Web Development"]}',
    });
  });

  test("rejects unauthenticated requests before checking access", async () => {
    authMock.mockResolvedValue(null);

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "UNAUTHENTICATED",
      error: "You must be signed in to suggest tags.",
    });
    expect(isProUserMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("enforces a Pro subscription on the server", async () => {
    isProUserMock.mockResolvedValue(false);

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "PRO_REQUIRED",
      error: "AI tag suggestions require a Pro subscription.",
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("validates input before consuming rate limit quota", async () => {
    await expect(
      generateAutoTags({ ...validInput(), title: "   " })
    ).resolves.toEqual({
      success: false,
      code: "INVALID_INPUT",
      error: "Add a title before suggesting tags.",
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("enforces the per-user AI rate limit", async () => {
    const reset = Date.now() + 60_000;
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset,
    });

    const result = await generateAutoTags(validInput());

    expect(result).toMatchObject({
      success: false,
      code: "RATE_LIMITED",
      error: "You have reached the AI suggestion limit. Try again in 1 minute.",
    });
    expect(result).toHaveProperty("retryAfterSeconds");
    expect(checkRateLimitMock).toHaveBeenCalledWith("aiAutoTags", "user-1");
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("calls the Responses API, truncates content, and normalizes object output", async () => {
    const content = `start-${"x".repeat(2_500)}-end`;

    await expect(
      generateAutoTags({
        title: "  Build a Next app  ",
        content,
        existingTags: ["React"],
      })
    ).resolves.toEqual({
      success: true,
      data: ["typescript", "next.js", "web development"],
    });

    expect(responsesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5-nano",
        store: false,
        text: { format: { type: "json_object" } },
      })
    );
    const request = responsesCreateMock.mock.calls[0]?.[0] as {
      input: string;
    };
    expect(request.input).toContain("Build a Next app");
    expect(request.input).toContain("return the result as JSON");
    expect(request.input).not.toContain("-end");
    expect(request.input).toContain("Existing tags:\nReact");
  });

  test("accepts a top-level array and returns unique lowercase tags", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: '["CLI", "Shell", "cli", "Automation", "Productivity"]',
    });

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: true,
      data: ["cli", "shell", "automation", "productivity"],
    });
  });

  test("returns a safe service error for malformed model output", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockResolvedValue({ output_text: "not JSON" });

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error: "AI tag suggestions are temporarily unavailable. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate AI tag suggestions.",
      {}
    );
  });

  test("rejects responses without three unique new tags", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockResolvedValue({
      output_text: '{"tags":["testing","CLI","cli"]}',
    });

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error: "AI tag suggestions are temporarily unavailable. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate AI tag suggestions.",
      {}
    );
  });

  test("returns a clear service error when the OpenAI quota is exhausted", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue({
      status: 429,
      code: "insufficient_quota",
    });

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error:
        "AI tag suggestions are unavailable because the service quota is exhausted.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate AI tag suggestions.",
      { status: 429, code: "insufficient_quota" }
    );
  });

  test("returns a safe service error when OpenAI fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue(new Error("secret provider detail"));

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error: "AI tag suggestions are temporarily unavailable. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate AI tag suggestions.",
      {}
    );
  });

  test("handles a non-object provider failure safely", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue(null);

    await expect(generateAutoTags(validInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error: "AI tag suggestions are temporarily unavailable. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate AI tag suggestions.",
      {}
    );
  });
});

function validInput() {
  return {
    title: "Useful command",
    content: "pnpm test",
    existingTags: ["testing"],
  };
}

function sessionForUser(userId: string): Session {
  return {
    user: { id: userId },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}
