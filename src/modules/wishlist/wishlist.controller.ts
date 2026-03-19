import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { addWishlistSchema } from "./wishlist.schema.js";
import {
    addToWishlist,
    getWishlist,
    removeFromWishlist,
} from "./wishlist.service.js";

const router = Router();

// POST /wishlist — add a book
router.post(
    "/",
    requireAuth,
    validate({ body: addWishlistSchema }),
    async (req, res) => {
        try {
            const item = await addToWishlist(req.user!.id, req.body);
            res.status(201).json(item);
        } catch (error) {
            console.error("Add to wishlist error:", error);
            res.status(500).json({ error: "Failed to add to wishlist" });
        }
    }
);

// GET /wishlist — list user's wishlist
router.get("/", requireAuth, async (req, res) => {
    try {
        const items = await getWishlist(req.user!.id);
        res.json(items);
    } catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({ error: "Failed to get wishlist" });
    }
});

// DELETE /wishlist/:id — remove an entry
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const item = await removeFromWishlist(req.user!.id, req.params.id as string);
        if (!item) {
            res.status(404).json({ error: "Wishlist item not found" });
            return;
        }
        res.json({ message: "Removed from wishlist" });
    } catch (error) {
        console.error("Remove from wishlist error:", error);
        res.status(500).json({ error: "Failed to remove from wishlist" });
    }
});

export const wishlistRouter = router;
