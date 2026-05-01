import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { clerkClient } from "@clerk/nextjs/server";

const redis =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const isLocal = process.env.NODE_ENV !== "production";

const ratelimit =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(1, "1440 m"),
        analytics: true,
      })
    : undefined;

const byokRateLimit =
  !isLocal && redis
    ? new Ratelimit({
        redis: redis,
        limiter: Ratelimit.fixedWindow(15, "1440 m"),
        analytics: true,
      })
    : undefined;

const DEFAULT_LIMIT = 5;
const DEFAULT_RESET = null;
const BYOK_PREFIX = "byok-";

const fallbackAllow = {
  success: true,
  remaining: DEFAULT_LIMIT,
  limit: DEFAULT_LIMIT,
  reset: DEFAULT_RESET,
};

const fallbackDeny = {
  success: false,
  remaining: 0,
  limit: 0,
  reset: null,
};

export const limitResearch = async ({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) => {
  if (clerkUserId) {
    const client = await clerkClient();
    try {
      const user = await client.users.getUser(clerkUserId);
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email && email.endsWith("@together.ai")) {
        return fallbackAllow;
      }
    } catch {
      // If Clerk fails, continue to normal rate limiting
    }
  }

  if (!clerkUserId) {
    return fallbackDeny;
  }

  if (!ratelimit || !byokRateLimit) {
    return fallbackDeny;
  }

  const result = isBringingKey
    ? await byokRateLimit.limit(BYOK_PREFIX + clerkUserId)
    : await ratelimit.limit(clerkUserId);

  return {
    success: result.success,
    remaining: result.remaining,
    limit: result.limit,
    reset: result.reset,
  };
};

export const getRemainingResearch = async ({
  clerkUserId,
  isBringingKey,
}: {
  clerkUserId?: string;
  isBringingKey?: boolean;
}) => {
  if (clerkUserId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(clerkUserId);
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email && email.endsWith("@together.ai")) {
        return fallbackAllow;
      }
    } catch {
      // If Clerk fails, continue to normal rate limiting
    }
  }

  if (!clerkUserId) {
    return fallbackDeny;
  }

  if (!ratelimit || !byokRateLimit) {
    return fallbackDeny;
  }

  try {
    const result = isBringingKey
      ? await byokRateLimit.getRemaining(BYOK_PREFIX + clerkUserId)
      : await ratelimit.getRemaining(clerkUserId);

    return result;
  } catch {
    return fallbackDeny;
  }
};
