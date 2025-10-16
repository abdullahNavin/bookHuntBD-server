const axios = require("axios");

async function scrapeBoiBazar(query) {
  try {
    const searchUrl = `https://m.boibazar.com/api/product/all-search/products/?term=${encodeURIComponent(query)}`;

    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
    });

    if (!Array.isArray(data)) {
      return [];
    }

    const books = data.map((book) => ({
      site: "BoiBazar",
      title: book.name || "Unknown",
      author: book.authorObj?.name || "Unknown",
      publisher: "Unknown",
      price: book.price ? `৳ ${book.price}` : "N/A",
      oldPrice: book.previous_price ? `৳ ${book.previous_price}` : null,
      discount: book.previous_price
        ? `${Math.round(((book.previous_price - book.price) / book.previous_price) * 100)}%`
        : "0%",
      image: book.image
        ? `https://www.boibazar.com${book.image}`
        : "",
      link: `https://www.boibazar.com/${book.click_url}/${book.seo_url}`,
    }));

    return books;
  } catch (err) {
    console.error("BoiBazar scraping error:", err.message);
    return [];
  }
}

module.exports = scrapeBoiBazar;
