import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    jitter,
    withTimeout,
} from "./base.scraper.js";

interface EboigharProductJson {
    workExample?: Array<{
        publisher?: { name?: string };
        isbn?: string;
        numberOfPages?: number;
        inLanguage?: string;
        abstract?: string;
        potentialAction?: {
            expectsAcceptanceOf?: {
                Price?: number;
            };
        };
    }>;
}

export class EboigharScraper implements Scraper {
    readonly site = "eboighar";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://eboighar.com/ajx_search?term=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, {
            headers: { "User-Agent": USER_AGENT },
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const items: Partial<BookResult>[] = [];

        $("ul.s-result li a.clearfix").each((_, el) => {
            if (items.length >= MAX_RESULTS_PER_SCRAPER) return false;

            const link = $(el).attr("href") || "";
            const image = $(el).find("img.s-img").attr("src") || undefined;
            const title = $(el).find(".s-title").text().trim();
            const authors = $(el).find(".bk-detail .s-author");
            const author = $(authors[0]).text().trim() || undefined;
            const priceText = $(el).find(".s-amount").text().trim();
            const price = parsePrice(priceText);

            items.push({
                title,
                author,
                price,
                link,
                image,
                site: this.site,
            });
        });

        // Enrich with product page data — batched, capped
        const enrichItem = async (item: Partial<BookResult>): Promise<Partial<BookResult>> => {
            if (!item.link) return item;

            const res = await fetch(item.link, {
                headers: { "User-Agent": USER_AGENT },
            });
            const productHtml = await res.text();
            const $$ = cheerio.load(productHtml);

            const jsonScript = $$("#page_json").html();
            if (jsonScript) {
                const parsed: EboigharProductJson[] = JSON.parse(jsonScript);
                const work = parsed[0]?.workExample?.[0];
                if (work) {
                    item.publisher = work.publisher?.name || undefined;
                    const offerPrice = work.potentialAction?.expectsAcceptanceOf?.Price;
                    if (offerPrice) item.price = offerPrice;
                }
            }

            return item;
        };

        const enriched: PromiseSettledResult<Partial<BookResult>>[] = [];
        const batchSize = 3;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map((item) => withTimeout(enrichItem(item), 3000))
            );
            enriched.push(...results);
        }

        return enriched
            .filter(
                (r): r is PromiseFulfilledResult<Partial<BookResult>> =>
                    r.status === "fulfilled"
            )
            .map(
                (r) =>
                    ({
                        title: r.value.title || "Unknown",
                        author: r.value.author,
                        publisher: r.value.publisher,
                        price: r.value.price || 0,
                        oldPrice: r.value.oldPrice,
                        discount: r.value.discount,
                        image: r.value.image,
                        link: r.value.link || "",
                        site: r.value.site || "eboighar",
                    }) satisfies BookResult
            );
    }
}
