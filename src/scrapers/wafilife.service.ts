import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

interface WafilifeProduct {
    id: string;
    PID: string;
    name: string;
    slug: string;
    image?: {
        thumbnail?: string;
        original?: string;
    };
    price: number;
    sale_price?: number[];
    discount?: number;
    authors?: string[];
    publishers?: string[];
    product_type?: string;
    inStock?: boolean;
}

interface WafilifeApiResponse {
    items: WafilifeProduct[];
}

const WAFILIFE_BID = "6ffa78b0-87fa-42ba-9980-1f38243cafdd";

export class WafilifeScraper implements Scraper {
    readonly site = "wafilife";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const params = new URLSearchParams({
            keyword: query.trim(),
            bid: WAFILIFE_BID,
            seq: "1",
        });
        const searchUrl = `https://www.wafilife.com/api/search?${params.toString()}`;

        const response = await fetch(searchUrl, {
            method: "GET",
            headers: {
                "User-Agent": USER_AGENT,
                Accept: "application/json",
                Referer: "https://www.wafilife.com/",
            },
        });

        if (!response.ok) {
            console.error(
                `[wafilife] HTTP ${response.status} for query "${query}"`
            );
            return [];
        }

        let data: WafilifeApiResponse;
        try {
            data = (await response.json()) as WafilifeApiResponse;
        } catch {
            console.error(`[wafilife] Invalid JSON response for query "${query}"`);
            return [];
        }

        const products = data.items;

        if (!Array.isArray(products) || products.length === 0) {
            return [];
        }

        return products.slice(0, MAX_RESULTS_PER_SCRAPER).map((book) => {
            const salePrice = book.sale_price?.[0] || book.price;
            const price =
                typeof salePrice === "number" ? salePrice : book.price || 0;
            const oldPrice =
                book.price && book.price > price ? book.price : undefined;
            const discount = book.discount
                ? Math.round(book.discount)
                : oldPrice
                    ? calcDiscount(oldPrice, price)
                    : undefined;

            const imageUrl =
                book.image?.thumbnail || book.image?.original || undefined;

            let link = "";
            if (book.slug) {
                const decodedSlug = decodeURIComponent(book.slug);
                link = `https://www.wafilife.com/${decodedSlug}/pd/${book.id || book.PID}`;
            }

            return {
                title: book.name || "Unknown",
                author: book.authors?.[0] || undefined,
                publisher: book.publishers?.[0] || undefined,
                price,
                oldPrice,
                discount,
                image: imageUrl,
                link,
                site: this.site,
            };
        });
    }
}
