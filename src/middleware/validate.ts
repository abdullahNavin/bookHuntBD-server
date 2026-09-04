import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";

interface ValidateOptions {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}

export function validate(schemas: ValidateOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                Object.defineProperty(req, 'query', {
                    value: schemas.query.parse(req.query),
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            }
            if (schemas.params) {
                Object.defineProperty(req, 'params', {
                    value: schemas.params.parse(req.params),
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
            }
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    error: "Validation failed",
                    details: error.errors.map((e) => ({
                        field: e.path.join("."),
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
}
