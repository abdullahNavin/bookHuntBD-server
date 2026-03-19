import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                image?: string | null;
            };
        }
    }
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        req.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image,
        };

        next();
    } catch (error) {
        res.status(401).json({ error: "Unauthorized" });
    }
}
