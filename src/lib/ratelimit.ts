import { AppError } from "./errors";

/**
 * Simple in-memory fixed-window rate limiter. Suitable for a single-instance MVP.
 * For multi-instance deployments replace with a shared store (e.g. Redis).
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  if (process.env.DISABLE_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production") return;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) throw new AppError("RATE_LIMITED", "errors.rateLimited");
}

export function resetRateLimits() {
  buckets.clear();
}

export const LIMITS = {
  login: [8, 15 * 60_000],
  register: [5, 60 * 60_000],
  publicForm: [10, 60 * 60_000],
  passwordReset: [5, 60 * 60_000],
} as const;
