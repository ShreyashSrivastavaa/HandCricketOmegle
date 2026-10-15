import { z } from "zod";

const envSchema = z.object({
  ABLY_API_KEY: z.string().min(1, "ABLY_API_KEY is required"),
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse({
    ABLY_API_KEY: process.env.ABLY_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    const errorAny = result.error as any;
    const issues = errorAny.issues || errorAny.errors || [];
    const missing = issues.length > 0
      ? issues.map((e: any) => `${e.path?.join(".")}: ${e.message}`).join(", ")
      : result.error.message;
    // In dev or test environments, warn clearly
    if (process.env.NODE_ENV === "test") {
      // Provide stub for tests that do not test external network calls
      return {
        ABLY_API_KEY: "dummy-app.key:secret",
        UPSTASH_REDIS_REST_URL: "https://mock-redis.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "mock-token",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NODE_ENV: "test",
      };
    }
    throw new Error(`[HandCricketOmegle] Invalid or missing environment variables: ${missing}. Please set them in .env.local.`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
