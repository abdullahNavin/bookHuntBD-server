import * as cheerio from "cheerio";
import type { Scraper, BookResult } from "./base.scraper.js";
import {
    USER_AGENT,
    MAX_RESULTS_PER_SCRAPER,
    parsePrice,
    calcDiscount,
    jitter,
} from "./base.scraper.js";

export class ProthomaScraper implements Scraper {
    readonly site = "prothoma";

    async search(query: string): Promise<BookResult[]> {
        await jitter();

        const searchUrl = `https://www.prothoma.com/shop?search=${encodeURIComponent(query)}`;

        const response = await fetch(searchUrl, {
            headers: { "User-Agent": USER_AGENT },
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        const books: BookResult[] = [];

        $("div.oe_product").each((_, el) => {
            if (books.length >= MAX_RESULTS_PER_SCRAPER) return false;

            const title =
                $(el).find('a[itemprop="name"]').attr("content") ||
                $(el).find("h6.o_wsale_products_item_title a").text().trim() ||
                "Unknown";

            const link =
                $(el).find("a.oe_product_image_link").attr("href") ||
                $(el).find('a[itemprop="url"]').attr("href") ||
                "";
            const fullLink = link.startsWith("http")
                ? link
                : `https://www.prothoma.com${link.split("?")[0]}`;

            const image =
                $(el).find("span.oe_product_image_img_wrapper img").attr("src") || undefined;
            const fullImage = image && !image.startsWith("http")
                ? `https://www.prothoma.com${image}`
                : image;

            const priceText =
                $(el).find('span[itemprop="price"]').text().trim() ||
                $(el).find("div.product_price span.h6 .oe_currency_value").text().trim() ||
                "0";
            const price = parsePrice(priceText);

            const oldPriceText = $(el)
                .find("div.product_price del .oe_currency_value")
                .text()
                .trim();
            const oldPrice = oldPriceText ? parsePrice(oldPriceText) : undefined;

            const discountText = $(el)
                .find("span.user-select-none")
                .text()
                .trim();
            const discountMatch = discountText.match(/(\d+)/);
            const discount = discountMatch
                ? parseInt(discountMatch[1], 10)
                : oldPrice
                    ? calcDiscount(oldPrice, price)
                    : undefined;

            if (!title || price === 0) return;

            books.push({
                title,
                price,
                oldPrice,
                discount,
                image: fullImage,
                link: fullLink,
                site: this.site,
            });
        });

        return books;
    }
}
