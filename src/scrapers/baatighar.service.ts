import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

interface BaatigharProduct {
    name?: string;
    author_names?: string;
    publisher_names?: string;
    detail?: string;
    detail_strike?: string;
    image_url?: string;
    website_url?: string;
}

export class BaatigharScraper implements Scraper {
    readonly site = "baatighar";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const url = "https://baatighar.com/website/dr_search";
        const payload = {
            jsonrpc: "2.0",
            method: "call",
            params: { term: query, max_nb_chars: 84 },
            id: 12,
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        const results: BaatigharProduct[] =
            data?.result?.products?.results || [];

        return results.slice(0, MAX_RESULTS_PER_SCRAPER).map((item) => {
            // Extract new price from HTML snippet
            const $ = cheerio.load(item.detail || "");
            const newPriceText = $("span.oe_currency_value").first().text().trim();
            const price = parsePrice(newPriceText);

            // Extract old price from HTML snippet
            const old$ = cheerio.load(item.detail_strike || "");
            const oldPriceText = old$("span.oe_currency_value")
                .first()
                .text()
                .trim();
            const oldPrice = parsePrice(oldPriceText) || undefined;

            const discount = oldPrice ? calcDiscount(oldPrice, price) : undefined;

            return {
                title: item.name || "Unknown",
                author: item.author_names || undefined,
                publisher: item.publisher_names || undefined,
                price,
                oldPrice,
                discount,
                image: item.image_url
                    ? `https://baatighar.com${item.image_url}`
                    : undefined,
                link: item.website_url
                    ? `https://baatighar.com${item.website_url}`
                    : "",
                site: this.site,
            };
        });
    }
}
