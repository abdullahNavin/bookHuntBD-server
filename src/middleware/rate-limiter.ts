import type { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis.js";

interface RateLimiterOptions {
    windowMs: number; // Window size in milliseconds
    max: number; // Max requests per window
    keyPrefix?: string;
}

export function createRateLimiter(options: RateLimiterOptions) {
    const { windowMs, max, keyPrefix = "rl" } = options;
    const windowSec = Math.ceil(windowMs / 1000);

    return async (req: Request, res: Response, next: NextFunction) => {
        const ip =
            req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const key = `${keyPrefix}:${ip}`;

        try {
            const current = await redis.incr(key);

            if (current === 1) {
                await redis.expire(key, windowSec);
            }

            // Set rate limit headers
            res.setHeader("X-RateLimit-Limit", max);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));

            if (current > max) {
                const ttl = await redis.ttl(key);
                res.setHeader("Retry-After", ttl);
                res.status(429).json({
                    error: "Too many requests. Please try again later.",
                    retryAfter: ttl,
                });
                return;
            }

            next();
        } catch (error) {
            // If Redis is down, allow the request (fail open)
            console.error("Rate limiter error:", error);
            next();
        }
    };
}

// Pre-configured rate limiters
export const searchRateLimiter = createRateLimiter({
    windowMs: 60_000, // 1 minute
    max: 10,
    keyPrefix: "rl:search",
});

export const authRateLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 5,
    keyPrefix: "rl:auth",
});
