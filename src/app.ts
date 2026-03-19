import express from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { config } from "./config.js";

// Route imports
import { booksRouter } from "./modules/books/books.controller.js";
import { usersRouter } from "./modules/users/users.controller.js";
import { wishlistRouter } from "./modules/wishlist/wishlist.controller.js";
import { alertsRouter } from "./modules/alerts/alerts.controller.js";

const app = express();

// ─── Security ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
    cors({
        origin: config.FRONTEND_URL,
        credentials: true,
    })
);
app.use(express.json());

// ─── Better Auth handler (must be before other routes) ──────────────
// Better Auth handles /api/auth/* routes internally
app.all("/api/auth/*splat", toNodeHandler(auth));

// ─── API Routes ─────────────────────────────────────────────────────
app.use("/api/books", booksRouter);
app.use("/api/users", usersRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/alerts", alertsRouter);

// ─── Health check ───────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({
        status: "ok",
        service: "BookHuntBD API",
        version: "2.0.0",
    });
});

// ─── Global error handler ───────────────────────────────────────────
app.use(
    (
        err: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        console.error("Unhandled error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
);

export { app };
