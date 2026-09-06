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
    results: WafilifeProduct[];
    total?: number;
}

export class WafilifeScraper implements Scraper {
    readonly site = "wafilife";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://www.wafilife.com/api/mobile/solr/products`;

        const response = await fetch(searchUrl, {
            method: "POST",
            headers: {
                "User-Agent": USER_AGENT,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                query,
                category: "",
                sort: "custom_score desc",
                excludeBundle: true,
                pageSize: MAX_RESULTS_PER_SCRAPER,
            }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        const products: WafilifeProduct[] = data.results || data.products || (Array.isArray(data) ? data : []);

        return products.slice(0, MAX_RESULTS_PER_SCRAPER).map((book) => {
            const salePrice = book.sale_price?.[0] || book.price;
            const price = typeof salePrice === "number" ? salePrice : book.price || 0;
            const oldPrice = book.price && book.price > price ? book.price : undefined;
            const discount = book.discount
                ? Math.round(book.discount)
                : oldPrice
                    ? calcDiscount(oldPrice, price)
                    : undefined;

            const imageUrl = book.image?.thumbnail || book.image?.original || undefined;
            const link = book.slug
                ? `https://www.wafilife.com/${book.slug}/pd/${book.PID || book.id}`
                : "";

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
