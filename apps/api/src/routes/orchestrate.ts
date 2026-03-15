import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { OrchestratorAgent } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

const orchestrateSchema = z.object({
  maxBudgetUsd: z.number().min(0.1).max(100).default(20),
});

export const orchestrateRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/events/:id/orchestrate — kick off full event planning
  app.post<{ Params: { id: string } }>(
    "/:id/orchestrate",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { userId, roles } = request.jwtPayload;

      if (!roles.includes("organizer") && !roles.includes("platform_admin")) {
        throw app.httpErrors.forbidden("Only organizers can trigger orchestration");
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const body = orchestrateSchema.parse(request.body ?? {});
      const orchestrator = new OrchestratorAgent(app.db);

      const result = await orchestrator.orchestrate({
        eventId: request.params.id,
        actorId: userId,
        maxBudgetUsd: body.maxBudgetUsd,
      });

      // Broadcast progress to WebSocket subscribers
      app.broadcast(`event:${request.params.id}`, "orchestration_complete", {
        approvalGateId: result.approvalGateId,
        conflicts: result.plan.conflicts,
        nextSteps: result.plan.nextSteps,
        durationMs: result.durationMs,
        costUsd: result.totalCostUsd,
      });

      reply.send({ data: result });
    },
  );
};
