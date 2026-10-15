import { Redis } from "@upstash/redis";
import { getEnv } from "../env";

// In-memory fallback cache for development or tests without live Upstash Redis
class MemoryRedis {
  private store = new Map<string, { value: any; expiresAt?: number }>();
  private lists = new Map<string, any[]>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: any, opts?: { ex?: number }): Promise<"OK"> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key) || this.lists.delete(key);
    return existed ? 1 : 0;
  }

  async rpush(key: string, ...elements: any[]): Promise<number> {
    const list = this.lists.get(key) || [];
    list.push(...elements);
    this.lists.set(key, list);
    return list.length;
  }

  async lpop<T>(key: string): Promise<T | null> {
    const list = this.lists.get(key);
    if (!list || list.length === 0) return null;
    const item = list.shift();
    return item as T;
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const list = this.lists.get(key) || [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end) as T[];
  }

  async lrem(key: string, _count: number, element: any): Promise<number> {
    const list = this.lists.get(key);
    if (!list) return 0;
    const initialLen = list.length;
    const filtered = list.filter((item) => {
      if (typeof item === "object" && typeof element === "object") {
        return JSON.stringify(item) !== JSON.stringify(element);
      }
      return item !== element;
    });
    this.lists.set(key, filtered);
    return initialLen - filtered.length;
  }
}

let redisInstance: Redis | MemoryRedis | null = null;

export function getRedis(): Redis | MemoryRedis {
  if (redisInstance) return redisInstance;

  try {
    const env = getEnv();
    if (
      env.UPSTASH_REDIS_REST_URL.includes("mock-redis") ||
      env.UPSTASH_REDIS_REST_TOKEN.includes("mock")
    ) {
      console.warn("[Hand Cricket Live] Using In-Memory Redis fallback for development/testing.");
      redisInstance = new MemoryRedis();
      return redisInstance;
    }

    redisInstance = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redisInstance;
  } catch (err) {
    console.warn("[Hand Cricket Live] Failed to initialize Upstash Redis, falling back to memory store:", err);
    redisInstance = new MemoryRedis();
    return redisInstance;
  }
}
