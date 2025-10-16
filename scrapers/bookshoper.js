const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeBookShoper(query) {
    try {
        const searchUrl = `https://bookshoper.com/book-search?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
        });

        const $ = cheerio.load(data);
        const books = [];

        $(".book-card").each((_, el) => {
            const title = $(el).find(".book_name").text().trim() || "Unknown";
            const author = $(el).find(".text-success").text().trim() || "Unknown";
            const publisher = $(el).find(".text-secondary small").text().trim() || "Unknown";
            const discount = $(el).find(".discount-badge b").text().trim() || "0";
            const price = $(el).find("b").first().text().replace(/[^\d]/g, "") || "N/A";
            const oldPrice = $(el).find("del").text().replace(/[^\d]/g, "") || "";
            const link = $(el).find("a.a").attr("href") || "";
            const image = $(el).find("img").attr("src") || "";

            books.push({
                site: "BookShoper",
                title,
                author,
                publisher,
                discount: `${discount}%`,
                price: `৳ ${price}`,
                oldPrice: oldPrice ? `৳ ${oldPrice}` : null,
                link,
                image,
            });
        });

        return books;
    } catch (err) {
        console.error("BookShoper scraping error:", err.message);
        return [];
    }
}

module.exports = { scrapeBookShoper };
