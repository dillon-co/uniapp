import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, desc, gte, sql, count, sum, avg } from "drizzle-orm";
import { auditLog, events } from "@uniapp/db";
import { authenticate, requireRoles } from "../middleware/auth.js";

export const observabilityRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:id/agents — all agent runs for an event
  app.get<{ Params: { id: string } }>(
    "/:id/agents",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.id),
        columns: { organizerId: true },
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const { userId, roles } = request.jwtPayload;
      if (event.organizerId !== userId && !roles.includes("platform_admin")) {
        throw app.httpErrors.forbidden("Access denied");
      }

      const agentRuns = await app.db.query.auditLog.findMany({
        where: and(
          eq(auditLog.eventId, request.params.id),
          eq(auditLog.action, "agent_run"),
        ),
        orderBy: [desc(auditLog.createdAt)],
        limit: 100,
      });

      // Aggregate stats
      const stats = {
        totalRuns: agentRuns.length,
        totalCostUsd: agentRuns.reduce((sum, r) => sum + (r.costUsd ?? 0), 0),
        totalDurationMs: agentRuns.reduce((sum, r) => sum + (r.durationMs ?? 0), 0),
        byAgentType: agentRuns.reduce<Record<string, { runs: number; costUsd: number }>>((acc, r) => {
          const type = r.agentType;
          if (!acc[type]) acc[type] = { runs: 0, costUsd: 0 };
          acc[type]!.runs++;
          acc[type]!.costUsd += r.costUsd ?? 0;
          return acc;
        }, {}),
      };

      return { data: agentRuns, meta: stats };
    },
  );

  // GET /api/v1/metrics — platform-wide observability metrics
  app.get(
    "/",
    { onRequest: [requireRoles("platform_admin")] },
    async (_request) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

      const [agentStats] = await app.db
        .select({
          totalRuns: count(auditLog.id),
          totalCostUsd: sum(auditLog.costUsd),
          avgDurationMs: avg(auditLog.durationMs),
        })
        .from(auditLog)
        .where(and(eq(auditLog.action, "agent_run"), gte(auditLog.createdAt, since)));

      const byType = await app.db
        .select({
          agentType: auditLog.agentType,
          runs: count(auditLog.id),
          costUsd: sum(auditLog.costUsd),
          avgDurationMs: avg(auditLog.durationMs),
        })
        .from(auditLog)
        .where(and(eq(auditLog.action, "agent_run"), gte(auditLog.createdAt, since)))
        .groupBy(auditLog.agentType);

      // Error rate: actions where output contains error
      const [errorStats] = await app.db
        .select({ errorCount: count(auditLog.id) })
        .from(auditLog)
        .where(and(
          gte(auditLog.createdAt, since),
          sql`${auditLog.output}::text ILIKE '%error%'`,
        ));

      const totalRuns = Number(agentStats?.totalRuns ?? 0);
      const errorCount = Number(errorStats?.errorCount ?? 0);

      const metrics = {
        window: "24h",
        agents: {
          totalRuns,
          totalCostUsd: Number(agentStats?.totalCostUsd ?? 0).toFixed(4),
          avgDurationMs: Math.round(Number(agentStats?.avgDurationMs ?? 0)),
          errorRate: totalRuns > 0 ? `${((errorCount / totalRuns) * 100).toFixed(1)}%` : "0%",
          byType: byType.map((t) => ({
            type: t.agentType,
            runs: Number(t.runs),
            costUsd: Number(t.costUsd ?? 0).toFixed(4),
            avgDurationMs: Math.round(Number(t.avgDurationMs ?? 0)),
          })),
        },
        generatedAt: new Date().toISOString(),
      };

      return { data: metrics };
    },
  );

  // GET /api/v1/metrics/prometheus — Prometheus text format
  app.get(
    "/prometheus",
    { onRequest: [requireRoles("platform_admin")] },
    async (_request, reply) => {
      const since = new Date(Date.now() - 60 * 60 * 1000); // last 1h

      const [agentStats] = await app.db
        .select({
          totalRuns: count(auditLog.id),
          totalCostUsd: sum(auditLog.costUsd),
        })
        .from(auditLog)
        .where(and(eq(auditLog.action, "agent_run"), gte(auditLog.createdAt, since)));

      const byType = await app.db
        .select({ agentType: auditLog.agentType, runs: count(auditLog.id), costUsd: sum(auditLog.costUsd) })
        .from(auditLog)
        .where(and(eq(auditLog.action, "agent_run"), gte(auditLog.createdAt, since)))
        .groupBy(auditLog.agentType);

      const lines = [
        `# HELP uniapp_agent_runs_total Total agent runs in last hour`,
        `# TYPE uniapp_agent_runs_total counter`,
        `uniapp_agent_runs_total ${agentStats?.totalRuns ?? 0}`,
        `# HELP uniapp_agent_cost_usd_total Total AI cost in USD last hour`,
        `# TYPE uniapp_agent_cost_usd_total counter`,
        `uniapp_agent_cost_usd_total ${Number(agentStats?.totalCostUsd ?? 0).toFixed(6)}`,
        ...byType.flatMap((t) => [
          `uniapp_agent_runs_by_type{type="${t.agentType}"} ${t.runs}`,
          `uniapp_agent_cost_by_type{type="${t.agentType}"} ${Number(t.costUsd ?? 0).toFixed(6)}`,
        ]),
      ];

      reply.type("text/plain").send(lines.join("\n") + "\n");
    },
  );
};
