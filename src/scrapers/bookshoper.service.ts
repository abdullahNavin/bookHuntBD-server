// import * as cheerio from "cheerio";
// import type { Scraper, BookResult } from "./base.scraper.js";
// import {
//     USER_AGENT,
//     MAX_RESULTS_PER_SCRAPER,
//     parsePrice,
//     calcDiscount,
//     jitter,
// } from "./base.scraper.js";

// export class BookShoperScraper implements Scraper {
//     readonly site = "bookshoper";

//     async search(query: string): Promise<BookResult[]> {
//         await jitter();

//         const searchUrl = `https://bookshoper.com/book-search?q=${encodeURIComponent(query)}`;
//         const response = await fetch(searchUrl, {
//             headers: { "User-Agent": USER_AGENT },
//         });
//         const html = await response.text();
//         const $ = cheerio.load(html);
//         const books: BookResult[] = [];

//         $(".book-card").each((_, el) => {
//             if (books.length >= MAX_RESULTS_PER_SCRAPER) return false;

//             const title = $(el).find(".book_name").text().trim() || "Unknown";
//             const author = $(el).find(".text-success").text().trim() || undefined;
//             const publisher =
//                 $(el).find(".text-secondary small").text().trim() || undefined;
//             const discountText = $(el).find(".discount-badge b").text().trim();
//             const priceText =
//                 $(el).find("b").first().text().replace(/[^\d]/g, "") || "0";
//             const oldPriceText = $(el).find("del").text().replace(/[^\d]/g, "");
//             const link = $(el).find("a.a").attr("href") || "";
//             const image = $(el).find("img").attr("src") || undefined;

//             const price = parsePrice(priceText);
//             const oldPrice = oldPriceText ? parsePrice(oldPriceText) : undefined;
//             const discount = oldPrice ? calcDiscount(oldPrice, price) : undefined;

//             books.push({
//                 title,
//                 author,
//                 publisher,
//                 price,
//                 oldPrice,
//                 discount,
//                 image,
//                 link,
//                 site: this.site,
//             });
//         });

//         return books;
//     }
// }


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

            const title =
                $(el).find("b.book_name").text().trim() ||
                $(el).find("h3 b").first().text().trim() ||
                "Unknown";

            const author =
                $(el).find(".text-success").text().trim() ||
                $(el).find(".font-color-auther").text().trim() ||
                undefined;

            const publisher =
                $(el).find(".text-secondary small").text().trim() ||
                $(el).find(".text-primary").text().trim() ||
                undefined;

            const image =
                $(el).find("img").attr("src") || undefined;

            const link =
                $(el).find("a.a").attr("href") ||
                $(el).find("a").first().attr("href") ||
                "";

            let price = 0;
            let oldPrice: number | undefined;

            const priceSpan = $(el).find("span").filter((_, s) => $(s).find("del").length > 0);
            if (priceSpan.length > 0) {
                const priceText = priceSpan.find("b").first().text().replace(/[^\d.]/g, "");
                const oldPriceText = priceSpan.find("del").first().text().replace(/[^\d.]/g, "");
                price = priceText ? parseFloat(priceText) : 0;
                oldPrice = oldPriceText ? parseFloat(oldPriceText) : undefined;
            }

            if (price === 0) {
                const priceContainer = $(el)
                    .find("h3")
                    .filter((_, el) => $(el).find("del").length > 0);
                const priceText = priceContainer.find("b").text().replace(/[^\d.]/g, "");
                const oldPriceText = priceContainer.find("del").text().replace(/[^\d.]/g, "");
                price = priceText ? parseFloat(priceText) : 0;
                oldPrice = oldPriceText ? parseFloat(oldPriceText) : undefined;
            }

            const discount = oldPrice ? calcDiscount(oldPrice, price) : undefined;

            if (!title || price === 0) return;

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