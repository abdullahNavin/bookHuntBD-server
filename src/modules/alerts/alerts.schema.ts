import { z } from "zod";

export const createAlertSchema = z.object({
    title: z.string().min(1),
    targetPrice: z.number().positive(),
    link: z.string().url(),
    site: z.string().min(1),
});

export const updateAlertSchema = z.object({
    targetPrice: z.number().positive().optional(),
    isActive: z.boolean().optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
