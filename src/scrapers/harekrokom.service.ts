import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

export class HarekRokomScraper implements Scraper {
    readonly site = "harekrokom";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://harekrokom.com/autosearch/product/${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: { "User-Agent": USER_AGENT },
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const items: BookResult[] = [];

        $(".docname").each((_, el) => {
            if (items.length >= MAX_RESULTS_PER_SCRAPER) return false;

            const anchor = $(el).find("a");
            const rawLink = anchor.attr("href") || "";
            const link = rawLink.startsWith("http")
                ? rawLink
                : `https://harekrokom.com${rawLink}`;

            const imageSrc = $(el).find("img").attr("src") || "";
            const image = imageSrc.startsWith("http")
                ? imageSrc
                : `https://harekrokom.com${imageSrc}`;

            const titleRaw = $(el).find("p b").text().trim();
            const titleText = $(el).find("p").text().trim();
            const priceText = $(el).find("span").text().trim();
            const price = parsePrice(priceText);

            // Try to split author & publisher from title text
            let author: string | undefined;
            let publisher: string | undefined;
            const parts = titleText.split("-");
            if (parts.length >= 3) {
                author = parts[1].trim();
                publisher = parts[2].trim();
            } else if (parts.length === 2) {
                author = parts[1].trim();
            }

            items.push({
                title: titleRaw || titleText || "Unknown",
                author,
                publisher,
                price,
                link,
                image: image || undefined,
                site: this.site,
            });
        });

        // Enrich with product page details (oldPrice, discount)
        const enriched = await Promise.allSettled(
            items.map(async (item) => {
                if (!item.link || item.link === "https://harekrokom.com") return item;

                try {
                    const res = await fetch(item.link, {
                        headers: { "User-Agent": USER_AGENT },
                    });
                    const productHtml = await res.text();
                    const $$ = cheerio.load(productHtml);

                    const newPriceText = $$(".pro-details-price .new-price")
                        .first()
                        .text()
                        .trim();
                    const oldPriceText = $$(".pro-details-price .old-price")
                        .first()
                        .text()
                        .trim();
                    const offerText = $$(".pro-details-price .offer-price")
                        .first()
                        .text()
                        .trim();

                    const newPrice = parsePrice(newPriceText);
                    const oldPrice = parsePrice(oldPriceText);

                    if (newPrice > 0) item.price = newPrice;
                    if (oldPrice > 0) item.oldPrice = oldPrice;

                    if (offerText) {
                        const m = offerText.match(/(\d{1,3})/);
                        if (m) item.discount = parseInt(m[1], 10);
                    } else if (oldPrice > 0 && newPrice > 0) {
                        item.discount = calcDiscount(oldPrice, newPrice);
                    }

                    return item;
                } catch {
                    return item;
                }
            })
        );

        return enriched
            .filter(
                (r): r is PromiseFulfilledResult<BookResult> =>
                    r.status === "fulfilled"
            )
            .map((r) => r.value);
    }
}
