import { Redis } from "@upstash/redis";
import { getEnv } from "../env.ts";

// In-memory fallback cache for development or tests without live Upstash Redis
export class MemoryRedis {
  private store = new Map<string, { value: any; expiresAt?: number }>();
  private lists = new Map<string, any[]>();
  private sets = new Map<string, Set<any>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(
    key: string,
    value: any,
    opts?: { ex?: number; px?: number; nx?: boolean }
  ): Promise<"OK" | null> {
    // Checked synchronously (no await) so NX stays atomic like real Redis
    const existing = this.store.get(key);
    if (opts?.nx && existing && !(existing.expiresAt && Date.now() > existing.expiresAt)) return null;
    const ttlMs = opts?.px ?? (opts?.ex ? opts.ex * 1000 : undefined);
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(key: string): Promise<number> {
    const existed =
      this.store.delete(key) ||
      this.lists.delete(key) ||
      this.sets.delete(key);
    return existed ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 1;
  }

  async rpush(key: string, ...elements: any[]): Promise<number> {
    const list = this.lists.get(key) || [];
    list.push(...elements);
    this.lists.set(key, list);
    return list.length;
  }

  async lpush(key: string, ...elements: any[]): Promise<number> {
    const list = this.lists.get(key) || [];
    list.unshift(...elements);
    this.lists.set(key, list);
    return list.length;
  }

  async lpop<T>(key: string): Promise<T | null> {
    const list = this.lists.get(key);
    if (!list || list.length === 0) return null;
    const item = list.shift();
    return item as T;
  }

  async llen(key: string): Promise<number> {
    return this.lists.get(key)?.length ?? 0;
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const list = this.lists.get(key) || [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end) as T[];
  }

  async lset(key: string, index: number, value: any): Promise<"OK"> {
    const list = this.lists.get(key);
    if (list && index >= 0 && index < list.length) {
      list[index] = value;
    }
    return "OK";
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    const list = this.lists.get(key) || [];
    const end = stop === -1 ? list.length : stop + 1;
    this.lists.set(key, list.slice(start, end));
    return "OK";
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

  async sadd(key: string, ...members: any[]): Promise<number> {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    let added = 0;
    for (const m of members) {
      if (!s.has(m)) {
        s.add(m);
        added++;
      }
    }
    return added;
  }

  async sismember(key: string, member: any): Promise<number> {
    const s = this.sets.get(key);
    return s && s.has(member) ? 1 : 0;
  }

  async scard(key: string): Promise<number> {
    const s = this.sets.get(key);
    return s ? s.size : 0;
  }

  async smembers<T = string>(key: string): Promise<T[]> {
    const s = this.sets.get(key);
    return s ? (Array.from(s) as T[]) : [];
  }

  private sortedSets = new Map<string, Map<string, number>>();

  async zadd(
    key: string,
    ...scoreMembers: (number | string | { score: number; member: string })[]
  ): Promise<number> {
    let map = this.sortedSets.get(key);
    if (!map) {
      map = new Map<string, number>();
      this.sortedSets.set(key, map);
    }
    let added = 0;
    for (const item of scoreMembers) {
      if (typeof item === "object" && item !== null && "score" in item && "member" in item) {
        if (!map.has(item.member)) added++;
        map.set(item.member, item.score);
      }
    }
    return added;
  }

  async zrevrange<T = string>(
    key: string,
    start: number,
    stop: number,
    opts?: { withScores?: boolean }
  ): Promise<any[]> {
    const map = this.sortedSets.get(key);
    if (!map) return [];
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const end = stop === -1 ? sorted.length : stop + 1;
    const sliced = sorted.slice(start, end);
    if (opts?.withScores) {
      const result: any[] = [];
      for (const [member, score] of sliced) {
        result.push(member, score);
      }
      return result;
    }
    return sliced.map(([member]) => member);
  }

  async zrange<T = string>(
    key: string,
    start: number,
    stop: number,
    opts?: { withScores?: boolean; rev?: boolean }
  ): Promise<any[]> {
    if (opts?.rev) {
      return this.zrevrange(key, start, stop, opts);
    }
    const map = this.sortedSets.get(key);
    if (!map) return [];
    const sorted = Array.from(map.entries()).sort((a, b) => a[1] - b[1]);
    const end = stop === -1 ? sorted.length : stop + 1;
    const sliced = sorted.slice(start, end);
    if (opts?.withScores) {
      const result: any[] = [];
      for (const [member, score] of sliced) {
        result.push(member, score);
      }
      return result;
    }
    return sliced.map(([member]) => member);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const map = this.sortedSets.get(key);
    if (!map || !map.has(member)) return null;
    return map.get(member) ?? null;
  }

  async eval<T = any>(
    _script: string,
    keys: string[],
    args: any[]
  ): Promise<T | null> {
    const queueKey = keys[0];
    const currentGuestId = args[0];
    const maxAgeMs = Number(args[1]) || 25000;
    const now = Number(args[2]) || Date.now();

    const list = this.lists.get(queueKey);
    if (!list) return null;

    while (list.length > 0) {
      const item = list.shift();
      if (!item) continue;
      const parsed = typeof item === "string" ? JSON.parse(item) : item;
      if (
        parsed &&
        parsed.guestId !== currentGuestId &&
        now - parsed.joinedAt <= maxAgeMs
      ) {
        return (typeof item === "string" ? item : JSON.stringify(item)) as T;
      }
    }
    return null;
  }

  async flushall(): Promise<"OK"> {
    this.store.clear();
    this.lists.clear();
    this.sets.clear();
    this.sortedSets.clear();
    return "OK";
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __hand_cricket_redis__: Redis | MemoryRedis | undefined;
}

export function getRedis(): Redis | MemoryRedis {
  if (globalThis.__hand_cricket_redis__) return globalThis.__hand_cricket_redis__;

  try {
    const env = getEnv();
    if (
      env.UPSTASH_REDIS_REST_URL.includes("mock-redis") ||
      env.UPSTASH_REDIS_REST_TOKEN.includes("mock")
    ) {
      console.warn("[Hand Cricket Live] Using In-Memory Redis fallback for development/testing.");
      globalThis.__hand_cricket_redis__ = new MemoryRedis();
      return globalThis.__hand_cricket_redis__;
    }

    globalThis.__hand_cricket_redis__ = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
      // Commands issued in the same tick (Promise.all) go out as one HTTP request
      enableAutoPipelining: true,
    });
    return globalThis.__hand_cricket_redis__;
  } catch (err) {
    console.warn("[Hand Cricket Live] Failed to initialize Upstash Redis, falling back to memory store:", err);
    globalThis.__hand_cricket_redis__ = new MemoryRedis();
    return globalThis.__hand_cricket_redis__;
  }
}
