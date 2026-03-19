// eslint-disable-next-line @typescript-eslint/no-require-imports
import RedisModule from "ioredis";
import { config } from "../config.js";

// Workaround: ioredis CJS/ESM interop — access the default export properly
const Redis = (RedisModule as any).default || RedisModule;

export const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
});

redis.on("error", (err: Error) => {
    console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
    console.log("✅ Redis connected");
});
