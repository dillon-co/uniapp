import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

// In-memory LRU-style cache for development
// In production, replace with Redis via ioredis
const cache = new Map<string, { value: unknown; expiresAt: number }>();

declare module "fastify" {
  interface FastifyInstance {
    cache: {
      get<T>(key: string): T | null;
      set(key: string, value: unknown, ttlSeconds?: number): void;
      del(key: string): void;
      flush(): void;
    };
  }
}

const MAX_CACHE_SIZE = 1000;

const cachePluginImpl: FastifyPluginAsync = async (app) => {
  const cacheApi = {
    get<T>(key: string): T | null {
      const entry = cache.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
      }
      return entry.value as T;
    },

    set(key: string, value: unknown, ttlSeconds = 300): void {
      // Evict oldest entries if cache is full
      if (cache.size >= MAX_CACHE_SIZE) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },

    del(key: string): void {
      cache.delete(key);
    },

    flush(): void {
      cache.clear();
    },
  };

  app.decorate("cache", cacheApi);

  // Cleanup expired entries periodically (every 5 minutes)
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  }, 5 * 60 * 1000);

  app.addHook("onClose", async () => {
    clearInterval(cleanup);
  });

  // Redis connection stub for production
  if (process.env.REDIS_URL) {
    app.log.info(
      { redisUrl: process.env.REDIS_URL.replace(/:[^@]*@/, ":***@") },
      "Redis URL configured — switch cache implementation to ioredis for production",
    );
  }

  app.log.info("Cache plugin loaded (in-memory LRU, 1000 entries max, 5min TTL default)");
};

export const cachePlugin = fp(cachePluginImpl, { name: "cache" });
