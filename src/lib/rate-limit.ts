import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitName =
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "resendVerification";

type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

const RATE_LIMIT_CONFIG: Record<RateLimitName, RateLimitConfig> = {
  login: { limit: 5, windowSeconds: 15 * 60 },
  register: { limit: 3, windowSeconds: 60 * 60 },
  forgotPassword: { limit: 3, windowSeconds: 60 * 60 },
  resetPassword: { limit: 5, windowSeconds: 15 * 60 },
  resendVerification: { limit: 3, windowSeconds: 15 * 60 },
};

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

const limiters = new Map<RateLimitName, Ratelimit>();

function getLimiter(name: RateLimitName): Ratelimit | null {
  if (!redis) {
    return null;
  }

  let limiter = limiters.get(name);

  if (!limiter) {
    const { limit, windowSeconds } = RATE_LIMIT_CONFIG[name];
    limiter = new Ratelimit({
      redis,
      prefix: `ratelimit:${name}`,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    });
    limiters.set(name, limiter);
  }

  return limiter;
}

/**
 * Check the rate limit for a named bucket and identifier. Fails open (allows
 * the request) when Upstash is unconfigured or unavailable.
 */
export async function checkRateLimit(
  name: RateLimitName,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);

  if (!limiter) {
    return { success: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    return { success: true, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }
}

/** Clear used attempts for an identifier (e.g. after a successful login). */
export async function resetRateLimit(
  name: RateLimitName,
  identifier: string
): Promise<void> {
  const limiter = getLimiter(name);

  if (!limiter) {
    return;
  }

  try {
    await limiter.resetUsedTokens(identifier);
  } catch {
    // Best-effort reset; ignore store errors.
  }
}

/** Resolve the client IP from forwarding headers, falling back to "unknown". */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Build a 429 JSON response with a Retry-After header. */
export function tooManyRequestsResponse(reset: number): Response {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((reset - Date.now()) / 1000)
  );
  const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

  return Response.json(
    {
      error: `Too many attempts. Please try again in ${retryAfterMinutes} minute${
        retryAfterMinutes === 1 ? "" : "s"
      }.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}
