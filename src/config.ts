import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().startsWith("re_"),
    ALERT_FROM_EMAIL: z.string().email(),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z.coerce.number().default(3000),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
