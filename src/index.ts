import { config } from "./config.js";
import { app } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { scheduleJobs } from "./queues/queue.js";
import { startAlertWorker } from "./queues/alert.worker.js";
import { startCleanupWorker } from "./queues/cleanup.worker.js";

async function main() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log("✅ PostgreSQL connected");

        // Schedule repeatable BullMQ jobs
        await scheduleJobs();

        // Start workers
        startAlertWorker();
        startCleanupWorker();

        // Start Express server
        app.listen(config.PORT, () => {
            console.log(`\n🚀 BookHuntBD API running on http://localhost:${config.PORT}`);
            console.log(`   Environment: ${config.NODE_ENV}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down gracefully...");
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
});

main();
