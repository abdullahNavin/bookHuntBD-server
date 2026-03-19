import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { createAlertSchema, updateAlertSchema } from "./alerts.schema.js";
import {
    createAlert,
    getAlerts,
    updateAlert,
    deleteAlert,
} from "./alerts.service.js";

const router = Router();

// POST /alerts — create a price alert
router.post(
    "/",
    requireAuth,
    validate({ body: createAlertSchema }),
    async (req, res) => {
        try {
            const alert = await createAlert(req.user!.id, req.body);
            res.status(201).json(alert);
        } catch (error) {
            console.error("Create alert error:", error);
            res.status(500).json({ error: "Failed to create alert" });
        }
    }
);

// GET /alerts — list user's alerts
router.get("/", requireAuth, async (req, res) => {
    try {
        const alerts = await getAlerts(req.user!.id);
        res.json(alerts);
    } catch (error) {
        console.error("Get alerts error:", error);
        res.status(500).json({ error: "Failed to get alerts" });
    }
});

// PATCH /alerts/:id — update target price or deactivate
router.patch(
    "/:id",
    requireAuth,
    validate({ body: updateAlertSchema }),
    async (req, res) => {
        try {
            const alert = await updateAlert(req.user!.id, req.params.id as string, req.body);
            if (!alert) {
                res.status(404).json({ error: "Alert not found" });
                return;
            }
            res.json(alert);
        } catch (error) {
            console.error("Update alert error:", error);
            res.status(500).json({ error: "Failed to update alert" });
        }
    }
);

// DELETE /alerts/:id — delete an alert
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const alert = await deleteAlert(req.user!.id, req.params.id as string);
        if (!alert) {
            res.status(404).json({ error: "Alert not found" });
            return;
        }
        res.json({ message: "Alert deleted" });
    } catch (error) {
        console.error("Delete alert error:", error);
        res.status(500).json({ error: "Failed to delete alert" });
    }
});

export const alertsRouter = router;
