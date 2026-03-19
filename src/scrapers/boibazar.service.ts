import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

interface BoiBazarBook {
    name?: string;
    authorObj?: { name?: string };
    price?: number;
    previous_price?: number;
    image?: string;
    click_url?: string;
    seo_url?: string;
}

export class BoiBazarScraper implements Scraper {
    readonly site = "boibazar";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://m.boibazar.com/api/product/all-search/products/?term=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "application/json",
            },
        });
        const data = await response.json();

        if (!Array.isArray(data)) {
            return [];
        }

        return (data as BoiBazarBook[])
            .slice(0, MAX_RESULTS_PER_SCRAPER)
            .map((book) => {
                const price = book.price || 0;
                const oldPrice = book.previous_price || undefined;
                const discount = oldPrice ? calcDiscount(oldPrice, price) : undefined;

                return {
                    title: book.name || "Unknown",
                    author: book.authorObj?.name || undefined,
                    price,
                    oldPrice,
                    discount,
                    image: book.image
                        ? `https://www.boibazar.com${book.image}`
                        : undefined,
                    link: `https://www.boibazar.com/${book.click_url}/${book.seo_url}`,
                    site: this.site,
                };
            });
    }
}
