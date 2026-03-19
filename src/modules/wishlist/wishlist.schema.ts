import { z } from "zod";

export const addWishlistSchema = z.object({
    title: z.string().min(1),
    link: z.string().url(),
    image: z.string().optional(),
    price: z.number().optional(),
    site: z.string().optional(),
});

export type AddWishlistInput = z.infer<typeof addWishlistSchema>;
