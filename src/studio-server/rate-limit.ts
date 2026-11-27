import type { IncomingMessage } from "node:http";
import type { RateLimitConfig } from "./types.ts";

/**
 * Lightweight, memory-safe in-memory rate limiter with periodic cleanup.
 * Prevents API exhaustion and abuse without requiring external Redis/database.
 */
export class MemoryRateLimiter {
  private records = new Map<string, { count: number; resetTime: number }>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  public config: RateLimitConfig;

  constructor(
    config: RateLimitConfig = {
      windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
      maxRequests: Number(process.env.AI_RATE_LIMIT_MAX) || 10,
    },
  ) {
    this.config = config;
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === "function") {
      this.cleanupTimer.unref();
    }
  }

  public check(key: string): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const existing = this.records.get(key);

    if (!existing || now >= existing.resetTime) {
      const resetTime = now + this.config.windowMs;
      this.records.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - 1),
        resetTime,
        retryAfterSeconds: 0,
      };
    }

    if (existing.count < this.config.maxRequests) {
      existing.count += 1;
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - existing.count),
        resetTime: existing.resetTime,
        retryAfterSeconds: 0,
      };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
    return {
      allowed: false,
      limit: this.config.maxRequests,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfterSeconds,
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.records.entries()) {
      if (now >= v.resetTime) {
        this.records.delete(k);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.records.clear();
  }
}

/** Global in-memory rate limiter instance for AI endpoints */
export const aiRateLimiter = new MemoryRateLimiter();

/** Resolves client IP address across reverse proxies (Cloudflare, Nginx, Vercel, Railway, etc.) */
export function getClientIp(req: IncomingMessage): string {
  const headers = req.headers || {};
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]!.trim();
  }
  const cfIp = headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) {
    return cfIp.trim();
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || "127.0.0.1";
}
