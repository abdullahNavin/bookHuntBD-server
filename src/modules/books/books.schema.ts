import { z } from "zod";

export const searchQuerySchema = z.object({
    query: z.string().min(1, "Search query is required").max(200),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
