const axios = require("axios");

async function scrapeDheeBooks(query) {
  try {
    const searchUrl = `https://server.dheebooks.com/search-books?name=${encodeURIComponent(
      query
    )}&editPage=false`;

    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
    });

    if (!data.books || !Array.isArray(data.books)) {
      return [];
    }

    const books = data.books.map((book) => ({
      site: "DheeBooks",
      title: book.title || "Unknown",
      author: book.author || "Unknown",
      publisher: book.publication || "Unknown",
      discount: book.retailDiscount ? `${book.retailDiscount}%` : "0%",
      price: book.price ? `৳ ${book.price}` : "N/A",
      link: `https://www.dheebooks.com/book-details/${book.bookId}/${book.englishTitle}`,
      image: book.coverImageUrl || "",
      stockStatus: book.stockStatus || "Unknown",
    }));

    return books;
  } catch (err) {
    console.error("DheeBooks scraping error:", err.message);
    return [];
  }
}

module.exports = scrapeDheeBooks;
