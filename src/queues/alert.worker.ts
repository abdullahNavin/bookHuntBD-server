import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { scrapers, withTimeout } from "../scrapers/index.js";
import { sendPriceAlertEmail } from "../lib/email.js";
import { parsePrice } from "../scrapers/base.scraper.js";

export function startAlertWorker() {
    const worker = new Worker(
        "alert-queue",
        async () => {
            console.log("🔔 Running price alert check...");

            // Fetch all active, un-notified alerts
            const alerts = await prisma.priceAlert.findMany({
                where: {
                    isActive: true,
                    notifiedAt: null,
                },
                include: {
                    user: {
                        select: { email: true },
                    },
                },
            });

            console.log(`Found ${alerts.length} active alert(s) to check.`);

            for (const alert of alerts) {
                try {
                    // Find the right scraper for this alert's site
                    const scraper = scrapers.find((s) => s.site === alert.site);
                    if (!scraper) {
                        console.warn(`No scraper found for site: ${alert.site}`);
                        continue;
                    }

                    // Re-scrape using the book title as query
                    const results = await withTimeout(scraper.search(alert.title), 10000);

                    // Find the matching book by link
                    const match = results.find((r) => r.link === alert.link);
                    if (!match) {
                        console.log(
                            `Book not found in results for alert: ${alert.title}`
                        );
                        continue;
                    }

                    const currentPrice = match.price;

                    if (currentPrice <= alert.targetPrice) {
                        // Price target met — send email
                        await sendPriceAlertEmail({
                            to: alert.user.email,
                            bookTitle: alert.title,
                            currentPrice,
                            targetPrice: alert.targetPrice,
                            bookLink: alert.link,
                            site: alert.site,
                        });

                        // Mark as notified
                        await prisma.priceAlert.update({
                            where: { id: alert.id },
                            data: { notifiedAt: new Date() },
                        });

                        console.log(
                            `✅ Alert triggered for "${alert.title}" — ৳${currentPrice} <= ৳${alert.targetPrice}`
                        );
                    }
                } catch (error) {
                    console.error(
                        `Error processing alert for "${alert.title}":`,
                        error
                    );
                }
            }

            console.log("🔔 Price alert check complete.");
        },
        {
            connection: redis,
            concurrency: 1,
        }
    );

    worker.on("failed", (job, err) => {
        console.error(`Alert job ${job?.id} failed:`, err.message);
    });

    console.log("✅ Alert worker started");
    return worker;
}
