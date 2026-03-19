import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

// ─── Alert Queue ────────────────────────────────────────────────────
export const alertQueue = new Queue("alert-queue", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
    },
});

// ─── Scrape Queue ───────────────────────────────────────────────────
export const scrapeQueue = new Queue("scrape-queue", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 200 },
    },
});

// ─── Cleanup Queue ──────────────────────────────────────────────────
export const cleanupQueue = new Queue("cleanup-queue", {
    connection: redis,
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: { count: 10 },
    },
});

// ─── Schedule repeatable jobs ───────────────────────────────────────
export async function scheduleJobs() {
    // Price alert check every 6 hours
    await alertQueue.upsertJobScheduler(
        "check-alerts",
        { pattern: "0 */6 * * *" }, // every 6 hours
        { name: "check-alerts" }
    );

    // Stale cache cleanup every night at 3 AM
    await cleanupQueue.upsertJobScheduler(
        "cleanup-stale-cache",
        { pattern: "0 3 * * *" }, // daily at 3 AM
        { name: "cleanup-stale-cache" }
    );

    console.log("✅ Repeatable jobs scheduled");
}
