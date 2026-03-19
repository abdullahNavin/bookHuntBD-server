import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

export class BookShoperScraper implements Scraper {
    readonly site = "bookshoper";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://bookshoper.com/book-search?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: { "User-Agent": USER_AGENT },
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const books: BookResult[] = [];

        $(".book-card").each((_, el) => {
            if (books.length >= MAX_RESULTS_PER_SCRAPER) return false;

            const title = $(el).find(".book_name").text().trim() || "Unknown";
            const author = $(el).find(".text-success").text().trim() || undefined;
            const publisher =
                $(el).find(".text-secondary small").text().trim() || undefined;
            const discountText = $(el).find(".discount-badge b").text().trim();
            const priceText =
                $(el).find("b").first().text().replace(/[^\d]/g, "") || "0";
            const oldPriceText = $(el).find("del").text().replace(/[^\d]/g, "");
            const link = $(el).find("a.a").attr("href") || "";
            const image = $(el).find("img").attr("src") || undefined;

            const price = parsePrice(priceText);
            const oldPrice = oldPriceText ? parsePrice(oldPriceText) : undefined;
            const discount = oldPrice ? calcDiscount(oldPrice, price) : undefined;

            books.push({
                title,
                author,
                publisher,
                price,
                oldPrice,
                discount,
                image,
                link,
                site: this.site,
            });
        });

        return books;
    }
}
