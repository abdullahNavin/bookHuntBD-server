import { z } from "zod";

export const searchQuerySchema = z.object({
    query: z.string().min(1, "Search query is required").max(200),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    site: z.string().min(1).optional(),
    sort: z.enum(["price_asc", "price_desc"]).default("price_asc"),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
