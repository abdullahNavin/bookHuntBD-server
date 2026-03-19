import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { searchRateLimiter } from "../../middleware/rate-limiter.js";
import { searchQuerySchema } from "./books.schema.js";
import { searchBooks } from "./books.service.js";

const router = Router();

// GET /books/search?query=...&page=1&limit=10
router.get(
    "/search",
    searchRateLimiter,
    validate({ query: searchQuerySchema }),
    async (req, res) => {
        try {
            const result = await searchBooks(req.query as any);
            res.json(result);
        } catch (error) {
            console.error("Search error:", error);
            res.status(500).json({ error: "Failed to search books" });
        }
    }
);

export const booksRouter = router;
