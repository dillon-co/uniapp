import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

interface LatencyBucket {
  le: number; // upper bound in ms
  count: number;
}

interface RouteMetrics {
  count: number;
  errorCount: number;
  totalDurationMs: number;
}

interface MetricsStore {
  requestCount: number;
  errorCount: number;
  /** Total duration across all requests in ms */
  totalDurationMs: number;
  /** Per-route breakdown */
  routes: Record<string, RouteMetrics>;
  /** Latency histogram buckets */
  latencyBuckets: LatencyBucket[];
  startedAt: string;
}

declare module "fastify" {
  interface FastifyInstance {
    metrics: MetricsStore;
  }
}

const BUCKET_BOUNDS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];

function makeBuckets(): LatencyBucket[] {
  return BUCKET_BOUNDS.map((le) => ({ le, count: 0 }));
}

function recordLatency(buckets: LatencyBucket[], durationMs: number): void {
  for (const bucket of buckets) {
    if (durationMs <= bucket.le) {
      bucket.count++;
    }
  }
}

const metricsPluginImpl: FastifyPluginAsync = async (app) => {
  const store: MetricsStore = {
    requestCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    routes: {},
    latencyBuckets: makeBuckets(),
    startedAt: new Date().toISOString(),
  };

  app.decorate("metrics", store);

  // Track every request
  app.addHook("onRequest", async (request) => {
    (request as unknown as { _metricsStart: number })._metricsStart = Date.now();
    store.requestCount++;
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = (request as unknown as { _metricsStart?: number })._metricsStart;
    const durationMs = start !== undefined ? Date.now() - start : 0;

    store.totalDurationMs += durationMs;
    recordLatency(store.latencyBuckets, durationMs);

    const routeKey = `${request.method} ${request.routeOptions?.url ?? request.url}`;
    if (!store.routes[routeKey]) {
      store.routes[routeKey] = { count: 0, errorCount: 0, totalDurationMs: 0 };
    }
    const rm = store.routes[routeKey]!;
    rm.count++;
    rm.totalDurationMs += durationMs;
    if (reply.statusCode >= 500) {
      rm.errorCount++;
    }

    if (reply.statusCode >= 400) {
      store.errorCount++;
    }
  });

  // Expose /metrics endpoint
  app.get("/metrics", async () => {
    const avgLatencyMs =
      store.requestCount > 0 ? store.totalDurationMs / store.requestCount : 0;

    return {
      uptime: {
        startedAt: store.startedAt,
        uptimeSeconds: Math.floor((Date.now() - new Date(store.startedAt).getTime()) / 1000),
      },
      requests: {
        total: store.requestCount,
        errorRate:
          store.requestCount > 0
            ? parseFloat((store.errorCount / store.requestCount).toFixed(4))
            : 0,
      },
      errors: {
        total: store.errorCount,
      },
      latency: {
        avgMs: parseFloat(avgLatencyMs.toFixed(2)),
        histogram: store.latencyBuckets.map((b) => ({
          le: b.le === Infinity ? "+Inf" : b.le,
          count: b.count,
        })),
      },
      routes: Object.entries(store.routes).map(([route, rm]) => ({
        route,
        count: rm.count,
        errorCount: rm.errorCount,
        avgMs: rm.count > 0 ? parseFloat((rm.totalDurationMs / rm.count).toFixed(2)) : 0,
      })),
    };
  });
};

export const metricsPlugin = fp(metricsPluginImpl, {
  name: "metrics",
});
