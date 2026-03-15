import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { analytics } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const recordSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  metric: z.string().min(1),
  value: z.number(),
  dimensions: z.record(z.string(), z.unknown()).default({}),
  recordedAt: z.string().datetime().optional(),
});

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/analytics/record
  app.post("/record", { onRequest: [authenticate] }, async (request, reply) => {
    const body = recordSchema.parse(request.body);

    const [record] = await app.db
      .insert(analytics)
      .values({
        entityType: body.entityType,
        entityId: body.entityId,
        metric: body.metric,
        value: body.value,
        dimensions: body.dimensions,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
      })
      .returning();

    reply.status(201).send({ data: record });
  });

  // GET /api/v1/analytics/events/:id
  app.get<{ Params: { id: string } }>(
    "/events/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const { metric, limit } = z
        .object({
          metric: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(500).default(100),
        })
        .parse(request.query);

      const rows = await app.db.query.analytics.findMany({
        where: metric
          ? and(
              eq(analytics.entityType, "event"),
              eq(analytics.entityId, request.params.id),
              eq(analytics.metric, metric),
            )
          : and(eq(analytics.entityType, "event"), eq(analytics.entityId, request.params.id)),
        orderBy: [desc(analytics.recordedAt)],
        limit,
      });

      // Aggregate by metric
      const byMetric: Record<string, { count: number; sum: number; latest: number }> = {};
      for (const row of rows) {
        if (!byMetric[row.metric]) byMetric[row.metric] = { count: 0, sum: 0, latest: 0 };
        byMetric[row.metric]!.count++;
        byMetric[row.metric]!.sum += row.value;
        byMetric[row.metric]!.latest = row.value;
      }

      return { data: { eventId: request.params.id, records: rows, aggregates: byMetric } };
    },
  );

  // GET /api/v1/analytics/cities/:id
  app.get<{ Params: { id: string } }>(
    "/cities/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const { metric, limit } = z
        .object({
          metric: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(500).default(100),
        })
        .parse(request.query);

      const rows = await app.db.query.analytics.findMany({
        where: metric
          ? and(
              eq(analytics.entityType, "city"),
              eq(analytics.entityId, request.params.id),
              eq(analytics.metric, metric),
            )
          : and(eq(analytics.entityType, "city"), eq(analytics.entityId, request.params.id)),
        orderBy: [desc(analytics.recordedAt)],
        limit,
      });

      const byMetric: Record<string, { count: number; sum: number; avg: number }> = {};
      for (const row of rows) {
        if (!byMetric[row.metric]) byMetric[row.metric] = { count: 0, sum: 0, avg: 0 };
        byMetric[row.metric]!.count++;
        byMetric[row.metric]!.sum += row.value;
        byMetric[row.metric]!.avg = byMetric[row.metric]!.sum / byMetric[row.metric]!.count;
      }

      return { data: { cityId: request.params.id, records: rows, aggregates: byMetric } };
    },
  );
};
