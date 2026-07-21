import type { Session } from "next-auth";
import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";

import { auth } from "@/auth";
import { isProUser } from "@/lib/ai/access";
import { getOpenAIClient } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/rate-limit";

import { generateAutoTags, generateDescription } from "./ai";

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

describe("generateDescription", () => {
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
      output_text:
        '{"description":"Runs the project test suite. It helps catch regressions before release."}',
    });
  });

  test("rejects unauthenticated requests before checking access", async () => {
    authMock.mockResolvedValue(null);

    await expect(generateDescription(validDescriptionInput())).resolves.toEqual({
      success: false,
      code: "UNAUTHENTICATED",
      error: "You must be signed in to generate descriptions.",
    });
    expect(isProUserMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("enforces a Pro subscription on the server", async () => {
    isProUserMock.mockResolvedValue(false);

    await expect(generateDescription(validDescriptionInput())).resolves.toEqual({
      success: false,
      code: "PRO_REQUIRED",
      error: "AI description generation requires a Pro subscription.",
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("requires useful item context before consuming rate limit quota", async () => {
    await expect(
      generateDescription({
        itemType: "Command",
        title: " ",
        content: " ",
        language: "shell",
        url: "",
        tags: [],
        fileName: "",
      })
    ).resolves.toEqual({
      success: false,
      code: "INVALID_INPUT",
      error:
        "Add a title, content, URL, file, or tag before generating a description.",
    });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("enforces the per-user description rate limit", async () => {
    checkRateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const result = await generateDescription(validDescriptionInput());

    expect(result).toMatchObject({
      success: false,
      code: "RATE_LIMITED",
      error: "You have reached the AI description limit. Try again in 1 minute.",
    });
    expect(result).toHaveProperty("retryAfterSeconds");
    expect(checkRateLimitMock).toHaveBeenCalledWith("aiDescription", "user-1");
    expect(responsesCreateMock).not.toHaveBeenCalled();
  });

  test("uses current form context, truncates content, and normalizes output", async () => {
    const content = `start-${"x".repeat(4_500)}-end`;
    responsesCreateMock.mockResolvedValue({
      output_text:
        '{"description":"Runs the project test suite.\\nIt catches regressions quickly."}',
    });

    await expect(
      generateDescription({
        ...validDescriptionInput(),
        title: "  Verify a release  ",
        content,
      })
    ).resolves.toEqual({
      success: true,
      data: "Runs the project test suite. It catches regressions quickly.",
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
    expect(request.input).toContain("current unsaved form data");
    expect(request.input).toContain('"itemType": "Command"');
    expect(request.input).toContain('"title": "Verify a release"');
    expect(request.input).toContain('"language": "shell"');
    expect(request.input).toContain('"url": "https://example.com/docs"');
    expect(request.input).toContain('"testing"');
    expect(request.input).toContain('"fileName": "release.sh"');
    expect(request.input).not.toContain("-end");
  });

  test("limits a generated description to two sentences", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text:
        '{"description":"Runs tests. Reports failures clearly. Speeds up releases."}',
    });

    await expect(generateDescription(validDescriptionInput())).resolves.toEqual({
      success: true,
      data: "Runs tests. Reports failures clearly.",
    });
  });

  test("returns a safe service error for malformed model output", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockResolvedValue({ output_text: "not JSON" });

    await expect(generateDescription(validDescriptionInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error: "AI description generation is temporarily unavailable. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate an AI description.",
      {}
    );
  });

  test("returns a clear service error when the OpenAI quota is exhausted", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue({
      status: 429,
      code: "insufficient_quota",
    });

    await expect(generateDescription(validDescriptionInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error:
        "AI description generation is unavailable because the service quota is exhausted.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate an AI description.",
      { status: 429, code: "insufficient_quota" }
    );
  });

  test("does not expose provider details when generation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue(new Error("secret provider detail"));

    await expect(generateDescription(validDescriptionInput())).resolves.toEqual({
      success: false,
      code: "UNAVAILABLE",
      error: "AI description generation is temporarily unavailable. Try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to generate an AI description.",
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

function validDescriptionInput() {
  return {
    itemType: "Command",
    title: "Run release checks",
    content: "pnpm test && pnpm build",
    language: "shell",
    url: "https://example.com/docs",
    tags: ["testing", "release"],
    fileName: "release.sh",
  };
}

function sessionForUser(userId: string): Session {
  return {
    user: { id: userId },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}
