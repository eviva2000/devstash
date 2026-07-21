# AI Integration Plan

Research findings for integrating OpenAI GPT-5 Nano into DevStash.

---

## 1) Recommendation

Use the **official OpenAI JavaScript SDK** with the **Responses API** from server-only code. Keep **`gpt-5-nano`** as the baseline model for this work, and validate it with a small feature-specific evaluation set before rollout.

Use **Server Actions** for bounded, non-streaming outputs:

* auto-tagging
* summaries
* prompt optimization

Use a **Route Handler** for code explanation streaming, because streamed output fits that shape better than a Server Action return value.

All AI features should be **Pro-only**. Every server entry point must:

1. authenticate the user,
2. read the current plan and subscription status from the database,
3. validate and cap the input,
4. enforce a per-user AI limit,
5. then call OpenAI.

UI-only gating is only a convenience. It is not an authorization boundary.

---

## 2) Model choice

`gpt-5-nano` is a good fit for:

* classification
* tagging
* short summaries
* structured rewrites
* low-latency responses

It is also cheap enough that the feature set is financially safe if usage is controlled.

Still, one caution matters: for code explanation and prompt optimization, the model should be validated against a small set of real examples. If nano underperforms on those two features, route only those features to the stronger model and keep nano for the simpler tasks.

Practical default:

* **Auto-tagging:** nano
* **Summary:** nano
* **Prompt optimization:** nano, then evaluate
* **Code explanation:** nano first, but compare with a stronger option if needed

---

## 3) SDK and architecture

Use the official `openai` package and keep the client server-only.

```ts
import "server-only";
import OpenAI from "openai";

export const AI_MODEL = "gpt-5-nano-2025-08-07";

let client: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}
```

Recommended file layout:

```text
src/lib/ai/client.ts
src/lib/ai/schemas.ts
src/lib/ai/prompts.ts
src/lib/ai/authorization.ts
src/lib/ai/limits.ts
src/lib/ai/telemetry.ts
src/actions/ai.ts
src/app/api/ai/explain/route.ts
src/components/dashboard/ai/*
```

No database migration is required for the MVP. Keep AI output transient and apply accepted values through the existing item update flow.

---

## 4) Request flow

Every AI request should follow this sequence:

1. Authenticate with `auth()`.
2. Load the user from Prisma and require:

   * `plan === PRO`
   * `subscriptionStatus === ACTIVE`
3. If an `itemId` is supplied, fetch the item by both `itemId` and `session.user.id`.
4. Validate the input with Zod.
5. Enforce feature-specific content limits.
6. Apply a per-user burst limit.
7. Call OpenAI with:

   * a fixed model
   * versioned instructions
   * `store: false`
   * bounded output tokens
   * a privacy-preserving `safety_identifier`
8. Return a safe discriminated result.
9. Never return raw provider errors, API keys, stack traces, or content that should stay private.

---

## 5) Server action pattern

Use Server Actions for the three bounded features because they match the current codebase and keep authentication, authorization, validation, and safe errors in one place.

```ts
"use server";

import { z } from "zod";

const TagSuggestions = z.object({
  tags: z.array(z.string().trim().min(1).max(50)).max(8),
});

export async function suggestTags(input: unknown): Promise<AiResult<string[]>> {
  const access = await requireActiveProUser();
  if (!access.success) return access;

  const parsed = tagSuggestionInput.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error);

  const limit = await checkAiLimit(access.userId, "autoTags");
  if (!limit.success) return rateLimitedResult(limit.reset);

  try {
    const response = await getOpenAI().responses.parse({
      model: AI_MODEL,
      instructions: AUTO_TAG_INSTRUCTIONS,
      input: parsed.data.content,
      reasoning: { effort: "minimal" },
      max_output_tokens: 128,
      text: { format: zodTextFormat(TagSuggestions, "tag_suggestions") },
      store: false,
      safety_identifier: access.safetyIdentifier,
    });

    if (!response.output_parsed) return unavailableResult();

    return { success: true, data: response.output_parsed.tags };
  } catch (error) {
    return mapOpenAiError(error);
  }
}
```

Return type:

```ts
type AiErrorCode =
  | "UNAUTHENTICATED"
  | "PRO_REQUIRED"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "MODEL_REFUSAL"
  | "INCOMPLETE_RESPONSE"
  | "UNAVAILABLE";

type AiResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      code: AiErrorCode;
      error: string;
      retryAfterSeconds?: number;
    };
```

Structured Outputs are the right fit for tags and other structured responses, but they do not remove the need for server-side validation.

---

## 6) Feature design

### Auto-tagging

Purpose: suggest relevant tags when creating or editing an item.

Rules:

* load title, content, type, language, and existing tags on the server
* deduplicate against existing tags
* return up to 5–8 suggestions
* normalize with the same slug/name rules as the item layer
* do not return tag IDs from the model

UI:

* show chips
* allow accept all
* allow dismiss per chip
* allow regenerate
* do not save until the user confirms

Baseline:

* minimal reasoning
* non-streaming
* short output

### Summary

Purpose: generate a concise description of an item.

Rules:

* summarize item content as data
* ignore instructions found inside the content
* keep the original description until the user accepts the replacement

UI:

* preview in the description area
* replace
* copy
* reject
* regenerate

Baseline:

* non-streaming
* low reasoning
* short output

### Code explanation

Purpose: explain a code snippet clearly and safely.

Rules:

* treat the input as untrusted text
* never execute code
* do not enable tools for this request
* keep output display-only
* keep raw HTML disabled

UI:

* side panel or drawer
* skeleton loading state
* streamed explanation
* stop
* retry
* copy
* optional “Create note”

Baseline:

* streaming only for this feature
* low reasoning at first
* evaluate whether a stronger model is needed

### Prompt optimization

Purpose: improve a prompt without changing its intent.

Rules:

* preserve original constraints
* do not invent requirements
* show the optimized version separately from the original
* require explicit acceptance before replacing the current text

UI:

* side-by-side or inline diff
* keep original
* accept suggestion
* copy
* regenerate

Baseline:

* non-streaming
* medium output size
* low reasoning at first

---

## 7) Streaming design

Implement code explanation as `POST /api/ai/explain`.

Flow:

1. authenticate
2. verify Pro access from the database
3. verify ownership if an item is involved
4. validate input
5. enforce rate limits
6. begin streaming

Once streaming starts, headers cannot change. If the provider fails after partial output, send a terminal error event and preserve the partial text already shown.

Use:

* `Cache-Control: no-store`
* `AbortController` for cancellation
* normalized text deltas only
* no raw provider events in the browser

---

## 8) Pro gating and quotas

Create one server-only helper that returns either:

* a minimal authorized principal, or
* a stable error

Recommended rule:

```text
authorized = user.plan === PRO && user.subscriptionStatus === ACTIVE
```

Do not put plan fields in the client session just to authorize AI calls.

Use quotas that are strict enough to protect spend but still practical:

* burst limit per user
* daily limit per active Pro user
* optional tighter cap for code explanation
* global spend alert
* kill switch

If the quota store is unavailable, fail closed for AI work and return a retryable error before spending provider tokens.

---

## 9) Error handling

Map failures into product behavior rather than exposing provider detail.

| Condition                |             Retry? | User result                      |
| ------------------------ | -----------------: | -------------------------------- |
| No session               |                 No | Sign in required                 |
| Free/inactive user       |                 No | Pro required                     |
| Invalid input            |                 No | Validation message               |
| App quota exceeded       | No automatic retry | Retry later                      |
| Model refusal            |                 No | Cannot generate this output      |
| Incomplete response      |         Usually no | Shorten input or retry           |
| Provider 401/403         |                 No | AI temporarily unavailable       |
| Provider 429             |      Limited retry | Busy, try again shortly          |
| Provider 500/503/timeout |      Bounded retry | Temporarily unavailable          |
| Stream fails after start |   No status change | Keep partial text and show retry |

Log:

* feature name
* user hash
* model snapshot
* duration
* token usage
* normalized outcome
* attempt count
* provider request ID

Do not log:

* API keys
* raw prompts
* generated content
* full SDK errors
* auth headers

---

## 10) Cost and safety

Keep costs low by:

* capping input and output per feature
* using minimal reasoning where possible
* keeping prompts short and specific
* avoiding automatic regeneration
* caching only when the content hash and prompt version make it safe

Use `store: false` for one-shot features. Keep the privacy notice aligned with the fact that third-party AI processing is involved.

Prompt injection is not solved by HTML escaping. Treat item content, code, and prompt text as untrusted data. Separate it clearly from developer instructions, keep outputs schema-constrained where possible, and validate all structured output again on the server.

---

## 11) UI patterns

Every feature should follow the same state machine:

```text
idle -> requesting/streaming -> suggestion -> accepted or rejected
                     \-> error -> retry or idle
```

UI rules:

* disable duplicate submissions while active
* show clear action labels, not unlabeled spinners
* keep errors near the relevant control
* never overwrite user content automatically
* require explicit accept/replace
* preserve keyboard focus after accept or reject

Placement:

* Auto-tag: item create/edit dialog
* Summary: description area in create/edit dialog
* Code explanation: item drawer or detail panel
* Prompt optimizer: edit mode for prompts

---

## 12) Implementation roadmap

### Phase 1: Foundation

* install `openai`
* create server-only client
* add AI authorization helper
* add AI-specific fail-closed limits
* add telemetry and a kill switch
* define shared result types

### Phase 2: Auto-tagging

* create `suggestTags`
* add chip-based suggestion UI
* add accept/dismiss
* write tests

### Phase 3: Summary

* create `generateSummary`
* add preview/replace UI
* write tests

### Phase 4: Prompt optimization

* create `optimizePrompt`
* add diff/accept UI
* write tests

### Phase 5: Code explanation

* create streaming Route Handler
* add stop/retry/copy UI
* write tests for streaming and cancellation

### Phase 6: Rollout

* enable behind feature flags
* compare nano with a stronger model for the harder tasks
* review error rates, acceptance rate, latency, and cost
* expand only after the metrics are acceptable

---

## 13) Test plan

Test:

* unauthenticated users
* free users
* inactive users
* stale or tampered client claims
* input validation failures
* ownership checks
* quota failures
* provider refusal
* rate limit responses
* streaming cancellation
* partial stream failure
* safe error mapping
* telemetry without raw content

For the output quality itself, use a small representative fixture set for each feature:

* tags: precision, duplicates, invalid tags
* summaries: factual consistency and length
* code explanations: correctness and clarity
* prompt optimization: intent preservation and usefulness

---

## 14) File structure

```text
src/
├── lib/
│   └── ai/
│       ├── client.ts
│       ├── schemas.ts
│       ├── prompts.ts
│       ├── authorization.ts
│       ├── limits.ts
│       └── telemetry.ts
├── actions/
│   └── ai.ts
├── app/
│   └── api/
│       └── ai/
│           └── explain/
│               └── route.ts
└── components/
    └── dashboard/
        └── ai/
            ├── SuggestTagsButton.tsx
            ├── GenerateSummaryButton.tsx
            ├── CodeExplanation.tsx
            └── OptimizePromptButton.tsx
```

---

## 15) Dependencies

```json
{
  "openai": "^4.x",
  "zod": "^4.x"
}
```

If the current UI stack already includes Markdown rendering, toast notifications, and icon support, no extra dependencies are required for the MVP.

---

