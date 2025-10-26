const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Scrape HarekRokom search results and enrich each item by scraping
 * the product page to get oldPrice and discount when available.
 *
 * Returns an array of objects:
 * { site, title, author, publisher, price, oldPrice, discount, link, image }
 */
async function scrapeHarekRokom(query) {
  try {
    const searchUrl = `https://harekrokom.com/autosearch/product/${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    const $ = cheerio.load(data);
    const items = [];

    // Parse search result entries
    $(".docname").each((_, el) => {
      const anchor = $(el).find("a");
      const link = anchor.attr("href") || "";
      const fullLink = link.startsWith("http") ? link : `https://harekrokom.com${link}`;

      const imageSrc = $(el).find("img").attr("src") || "";
      const image = imageSrc.startsWith("http") ? imageSrc : `https://harekrokom.com${imageSrc}`;

      const titleRaw = $(el).find("p b").text().trim();
      const titleText = $(el).find("p").text().trim(); // may contain "title - author - publisher"
      const priceText = $(el).find("span").text().trim();
      const priceNum = priceText.replace(/[^\d]/g, "");

      // Try to split author & publisher if present in title text
      let author = "Unknown";
      let publisher = "Unknown";
      const parts = titleText.split("-");
      if (parts.length >= 3) {
        // Example: "পথের পাঁচালী - বিভূতিভূষণ ... - তাজমহল বুক ডিপো"
        author = parts[1].trim();
        publisher = parts[2].trim();
      } else if (parts.length === 2) {
        author = parts[1].trim();
      }

      items.push({
        site: "HarekRokom",
        title: titleRaw || titleText || "Unknown",
        author,
        publisher,
        price: priceNum ? `৳ ${priceNum}` : "N/A",
        oldPrice: null,      // will be filled after product page fetch if available
        discount: null,      // will be filled after product page fetch if available
        link: fullLink,
        image,
      });
    });

    // For each item, fetch product page to extract oldPrice and discount (if any).
    // Limit concurrency if you expect many items - here we use Promise.all for simplicity.
    const enriched = await Promise.all(
      items.map(async (it) => {
        try {
          // Some search entries may have empty or placeholder links; skip if no link
          if (!it.link || it.link === "https://harekrokom.com") return it;

          const { data: productHtml } = await axios.get(it.link, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            // optional: timeout: 8000
          });

          const $$ = cheerio.load(productHtml);

          // Example selectors from the product page snippet:
          // .pro-details-price .new-price
          // .pro-details-price .old-price
          // .pro-details-price .offer-price (contains "Save 30 %")
          const newPriceText = $$(".pro-details-price .new-price").first().text().trim();
          const oldPriceText = $$(".pro-details-price .old-price").first().text().trim();
          const offerText = $$(".pro-details-price .offer-price").first().text().trim();

          const newPriceNum = newPriceText.replace(/[^\d]/g, "");
          const oldPriceNum = oldPriceText.replace(/[^\d]/g, "");
          let discountText = null;

          if (offerText) {
            // offerText could be like "Save 30 %", or "30% OFF", or "Save 30 %"
            // Extract digits:
            const m = offerText.match(/(\d{1,3})/);
            if (m) discountText = `${m[1]}%`;
            else discountText = offerText;
          } else if (oldPriceNum && newPriceNum) {
            // Calculate discount from prices if offer text missing
            const oldP = parseFloat(oldPriceNum);
            const newP = parseFloat(newPriceNum);
            if (!isNaN(oldP) && oldP > 0 && !isNaN(newP)) {
              const perc = Math.round(((oldP - newP) / oldP) * 100);
              discountText = `${perc}%`;
            }
          }

          // Prefer product page values if available
          if (newPriceNum) it.price = `৳ ${newPriceNum}`;
          if (oldPriceNum) it.oldPrice = `৳ ${oldPriceNum}`;
          if (discountText) it.discount = discountText;

          return it;
        } catch (err) {
          // If product page fails, just return the original item (with null oldPrice/discount)
          // Log a short message for debugging
          // console.error("HarekRokom product page fetch error:", err.message);
          return it;
        }
      })
    );

    return enriched;
  } catch (err) {
    console.error("HarekRokom scraping error:", err.message);
    return [];
  }
}

module.exports = scrapeHarekRokom;
