import { Redis } from "@upstash/redis";
import Ably from "ably";
import fs from "fs";
import path from "path";

const envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [k, ...rest] = line.split("=");
  if (k && rest.length) {
    env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
});

async function run() {
  console.log("Verifying Upstash Redis connection...");
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  const pong = await redis.ping();
  console.log("Upstash Redis response:", pong);

  console.log("Verifying Ably token generation...");
  const rest = new Ably.Rest({ key: env.ABLY_API_KEY });
  const token = await rest.auth.createTokenRequest({ clientId: "verify-client" });
  console.log("Ably token clientId:", token.clientId);

  console.log("ALL_ENV_CHECKS_PASSED");
}

run().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
