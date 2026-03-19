const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrapes book data from eBoighar.com
 * 1. Uses AJAX search to get initial list
 * 2. Visits each book page to extract detailed info
 */
async function scrapeEboighar(query) {
  try {
    const searchUrl = `https://eboighar.com/ajx_search?term=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const $ = cheerio.load(data);
    const items = [];

    $("ul.s-result li a.clearfix").each((_, el) => {
      const link = $(el).attr("href");
      const image = $(el).find("img.s-img").attr("src");
      const title = $(el).find(".s-title").text().trim();
      const authors = $(el).find(".bk-detail .s-author");
      const author = $(authors[0]).text().trim() || "Unknown";
      const edition = $(authors[1]).text().trim() || null;
      const priceText = $(el).find(".s-amount").text().trim();
      const priceNum = priceText.replace(/[^\d.]/g, "");

      items.push({
        site: "eBoighar",
        title,
        author,
        edition,
        price: priceNum ? `৳${priceNum}` : "N/A",
        oldPrice: null,
        discount: null,
        publisher: null,
        isbn: null,
        pages: null,
        language: null,
        description: null,
        link,
        image,
      });
    });

    // Enrich with details from each book’s page
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const { data: html } = await axios.get(item.link, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            },
          });
          const $ = cheerio.load(html);

          const jsonScript = $("#page_json").html();
          if (jsonScript) {
            const parsed = JSON.parse(jsonScript)[0];
            const work = parsed?.workExample?.[0] || {};
            const offer = work?.potentialAction?.expectsAcceptanceOf || {};

            item.publisher = work?.publisher?.name || "Unknown";
            item.isbn = work?.isbn || null;
            item.pages = work?.numberOfPages || null;
            item.language = work?.inLanguage || null;
            item.description = work?.abstract || null;

            const price = offer?.Price ? `৳${offer.Price}` : item.price;
            item.price = price;

            // eBoighar doesn’t show discounts, but we can future-proof
            item.oldPrice = null;
            item.discount = null;
          }

          return item;
        } catch (err) {
          console.error("Error parsing eBoighar book:", err.message);
          return item;
        }
      })
    );

    return enriched;
  } catch (error) {
    console.error("Error scraping eBoighar:", error.message);
    return [];
  }
}

module.exports = scrapeEboighar;
