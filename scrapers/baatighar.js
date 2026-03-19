const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Search books on Baatighar.com by title or keyword.
 * @param {string} term - The search term (book title, author, etc.)
 * @returns {Promise<Array>} Array of book objects
 */
async function scrapeBaatighar(term) {
  const url = "https://baatighar.com/website/dr_search";

  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      term: term,
      max_nb_chars: 84,
    },
    id: 12,
  };

  try {
    const res = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const results = res.data?.result?.products?.results || [];

    const books = results.map((item) => {
      // Extract new price
      const $ = cheerio.load(item.detail || "");
      const newPrice = $("span.oe_currency_value").first().text().trim();

      // Extract old price
      const old$ = cheerio.load(item.detail_strike || "");
      const oldPrice = old$("span.oe_currency_value").first().text().trim();

      // Calculate discount percentage
      let discount = "";
      if (oldPrice && newPrice) {
        const oldNum = parseFloat(oldPrice.replace(/[^\d.]/g, ""));
        const newNum = parseFloat(newPrice.replace(/[^\d.]/g, ""));
        if (!isNaN(oldNum) && !isNaN(newNum) && oldNum > 0) {
          discount = Math.round(((oldNum - newNum) / oldNum) * 100) + "%";
        }
      }

      return {
        title: item.name,
        author: item.author_names || "",
        publisher: item.publisher_names || "",
        newPrice,
        oldPrice,
        discount,
        image: item.image_url
          ? `https://baatighar.com${item.image_url}`
          : null,
        link: item.website_url
          ? `https://baatighar.com${item.website_url}`
          : null,
      };
    });

    return books;
  } catch (error) {
    console.error("❌ Error fetching books from Baatighar:", error.message);
    return [];
  }
}


// Export for use in other files
module.exports = scrapeBaatighar;
