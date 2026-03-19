import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    jitter,
} from "./base.scraper.js";

interface DheeBook {
    title?: string;
    author?: string;
    publication?: string;
    retailDiscount?: number;
    price?: number;
    bookId?: string;
    englishTitle?: string;
    coverImageUrl?: string;
    stockStatus?: string;
}

export class DheeBooksScraper implements Scraper {
    readonly site = "dheebooks";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://server.dheebooks.com/search-books?name=${encodeURIComponent(query)}&editPage=false`;
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "application/json",
            },
        });
        const data = await response.json();

        if (!data.books || !Array.isArray(data.books)) {
            return [];
        }

        return (data.books as DheeBook[])
            .slice(0, MAX_RESULTS_PER_SCRAPER)
            .map((book) => ({
                title: book.title || "Unknown",
                author: book.author || undefined,
                publisher: book.publication || undefined,
                discount: book.retailDiscount || undefined,
                price: book.price || 0,
                link: `https://www.dheebooks.com/book-details/${book.bookId}/${book.englishTitle}`,
                image: book.coverImageUrl || undefined,
                site: this.site,
            }));
    }
}
