import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";

export function startCleanupWorker() {
    const worker = new Worker(
        "cleanup-queue",
        async () => {
            console.log("🧹 Running stale cache cleanup...");

            const { count } = await prisma.bookCache.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });

            console.log(`🧹 Removed ${count} expired cache entries.`);
        },
        {
            connection: redis,
            concurrency: 1,
        }
    );

    worker.on("failed", (job, err) => {
        console.error(`Cleanup job ${job?.id} failed:`, err.message);
    });

    console.log("✅ Cleanup worker started");
    return worker;
}
