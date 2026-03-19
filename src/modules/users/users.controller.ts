import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getUserProfile, updateUserProfile } from "./users.service.js";

const router = Router();

// GET /users/me
router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await getUserProfile(req.user!.id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json(user);
    } catch (error) {
        console.error("Get user profile error:", error);
        res.status(500).json({ error: "Failed to get user profile" });
    }
});

// PATCH /users/me
router.patch("/me", requireAuth, async (req, res) => {
    try {
        const { name, image } = req.body;
        const user = await updateUserProfile(req.user!.id, { name, image });
        res.json(user);
    } catch (error) {
        console.error("Update user profile error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

export const usersRouter = router;
