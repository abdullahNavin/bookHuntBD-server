const express = require('express');
const cors = require('cors');
const { scrapeBookShoper } = require('./scrapers/bookShoper.js');
const scrapeDheeBooks = require('./scrapers/dheebook.js');
const scrapeBoiBazar = require('./scrapers/boibazar.js');

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const results = await Promise.all([
      scrapeBookShoper(query),
      scrapeDheeBooks(query),
      scrapeBoiBazar(query),
      // add more scrapers later
    ]);

    res.json(results.flat());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch book data" });
  }
});

app.get("/", (req, res) => {
  res.send("BookHuntBD Server is running");
});

app.listen(5000, () => console.log("Server running on port 5000"));
