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

        $(".book-card, .card").each((_, el) => {
            if (books.length >= MAX_RESULTS_PER_SCRAPER) return false;

            // ✅ Title
            const title =
                $(el).find("h3 b").first().text().trim() || "Unknown";

            // ✅ Author
            const author =
                $(el).find(".font-color-auther").text().trim() || undefined;

            // ✅ Publisher
            const publisher =
                $(el).find(".text-primary").text().trim() || undefined;

            // ✅ Image
            const image =
                $(el).find("img").attr("src") || undefined;

            // ✅ Link (if available)
            const link =
                $(el).find("a.a").attr("href") || "";

            // ✅ PRICE FIX (IMPORTANT 🔥)
            const priceContainer = $(el)
                .find("h3")
                .filter((_, el) => $(el).find("del").length > 0);

            const priceRaw = priceContainer.find("b").text().trim();
            const oldPriceRaw = priceContainer.find("del").text().trim();

            // Clean numbers properly (keep decimal)
            const priceText = priceRaw.replace(/[^\d.]/g, "");
            const oldPriceText = oldPriceRaw.replace(/[^\d.]/g, "");

            const price = priceText ? parseFloat(priceText) : 0;
            const oldPrice = oldPriceText
                ? parseFloat(oldPriceText)
                : undefined;

            const discount = oldPrice
                ? calcDiscount(oldPrice, price)
                : undefined;

            // ❌ Skip invalid entries
            console.log(title, price);
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
        console.log(books);
        return books;
    }
}