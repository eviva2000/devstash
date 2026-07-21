import "server-only";

import OpenAI from "openai";

export const AI_MODEL = "gpt-5-nano";

let openAIClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  openAIClient ??= new OpenAI({ apiKey });
  return openAIClient;
}
