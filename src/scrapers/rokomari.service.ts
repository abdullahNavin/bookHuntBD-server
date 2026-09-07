import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

const ROKOMARI_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export class RokomariScraper implements Scraper {
    readonly site = "rokomari";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://www.rokomari.com/search?term=${encodeURIComponent(query)}&search_type=ALL`;

        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": ROKOMARI_UA,
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7",
            },
        });

        if (!response.ok) {
            console.error(
                `[rokomari] HTTP ${response.status} for query "${query}"`
            );
            return [];
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const books: BookResult[] = [];

        $("[class*='productGridItem']").each((_, el) => {
            if (books.length >= MAX_RESULTS_PER_SCRAPER) return false;

            const title =
                $(el).find("[class*='productTitle']").text().trim() || "Unknown";

            const author =
                $(el).find("[class*='productAuthor']").text().trim() || undefined;

            const image =
                $(el).find("[class*='bookImage'] img").attr("data-src") ||
                $(el).find("[class*='bookImage'] img").attr("src") ||
                undefined;

            const linkHref = $(el).find("a").first().attr("href") || "";
            const fullLink = linkHref.startsWith("http")
                ? linkHref
                : `https://www.rokomari.com${linkHref}`;

            let price = 0;
            let oldPrice: number | undefined;

            const pricePart = $(el).find("[class*='productPricePart']");
            const oldPriceText = pricePart.find("del").text().trim();
            if (oldPriceText) {
                oldPrice = parsePrice(oldPriceText);
            }

            const currentPriceText = pricePart
                .find("[class*='productPrice']")
                .text()
                .trim();
            if (currentPriceText) {
                price = parsePrice(currentPriceText);
            }

            const discountText = $(el)
                .find("[class*='commonBadages'] span")
                .text()
                .trim();
            const discountNum = parseInt(discountText, 10);
            const discount =
                !isNaN(discountNum) && discountNum > 0
                    ? discountNum
                    : oldPrice
                        ? calcDiscount(oldPrice, price)
                        : undefined;

            if (!title || title === "Unknown" || price === 0) return;

            books.push({
                title,
                author,
                price,
                oldPrice,
                discount,
                image,
                link: fullLink,
                site: this.site,
            });
        });

        return books;
    }
}
