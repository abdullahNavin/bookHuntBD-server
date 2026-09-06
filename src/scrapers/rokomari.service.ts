import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

export class RokomariScraper implements Scraper {
    readonly site = "rokomari";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://www.rokomari.com/search?term=${encodeURIComponent(query)}&search_type=BOOK`;

        const response = await fetch(searchUrl, {
            headers: { "User-Agent": USER_AGENT },
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        const books: BookResult[] = [];

        $(".books-wrapper__item").each((_, el) => {
            if (books.length >= MAX_RESULTS_PER_SCRAPER) return false;

            const wrapper = $(el).find(".product-card-wrapper");

            const title =
                $(el).find(".book-title").text().trim() || "Unknown";

            const author =
                $(el).find(".book-author").text().trim() || undefined;

            const image =
                $(el).find("div.book-img img").attr("data-src") || undefined;

            const link =
                $(el).find("a").first().attr("href") || "";
            const fullLink = link.startsWith("http")
                ? link
                : `https://www.rokomari.com${link}`;

            let price = 0;
            let oldPrice: number | undefined;

            const oldPriceText = $(el).find(".book-price strike.original-price").text().trim();
            if (oldPriceText) {
                oldPrice = parsePrice(oldPriceText);
            }

            const priceContainer = $(el).find(".book-price");
            priceContainer.find("strike").remove();
            const currentPriceText = priceContainer.text().trim();
            if (currentPriceText) {
                price = parsePrice(currentPriceText);
            }

            const discountText = $(el)
                .find(".discount-badge-common p")
                .text()
                .trim();
            const discountNum = parseInt(discountText, 10);
            const discount =
                !isNaN(discountNum) && discountNum > 0
                    ? discountNum
                    : oldPrice
                        ? calcDiscount(oldPrice, price)
                        : undefined;

            if (!title || price === 0) return;

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
