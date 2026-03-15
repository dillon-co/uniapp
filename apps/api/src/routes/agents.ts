import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AgentRuntime, type AgentType, CityAgent } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

const AGENT_TYPES = ["orchestrator", "venue-scout", "vendor-coordinator", "volunteer-coordinator", "permit-processor"] as const;

const runAgentSchema = z.object({
  agentType: z.enum(AGENT_TYPES),
  eventId: z.string().uuid(),
  task: z.string().min(1).max(5000),
  context: z.record(z.string(), z.unknown()).optional(),
  maxTurns: z.number().int().min(1).max(50).default(20),
  maxBudgetUsd: z.number().min(0.01).max(50).default(5),
});

// Track concurrent agents per event (in-memory; use Redis in production)
const activeAgents = new Map<string, number>();
const MAX_AGENTS_PER_EVENT = 10;

export const agentRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/agents/run — synchronous agent execution
  app.post(
    "/run",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { roles, userId } = request.jwtPayload;
      if (!roles.includes("organizer") && !roles.includes("platform_admin") && !roles.includes("city_admin")) {
        throw app.httpErrors.forbidden("Only organizers can run agents");
      }

      const body = runAgentSchema.parse(request.body);

      // Enforce concurrent agent limit
      const current = activeAgents.get(body.eventId) ?? 0;
      if (current >= MAX_AGENTS_PER_EVENT) {
        throw app.httpErrors.conflict(`Maximum concurrent agents (${MAX_AGENTS_PER_EVENT}) reached for this event`);
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      activeAgents.set(body.eventId, current + 1);

      try {
        const runtime = new AgentRuntime(app.db);
        const result = await runtime.run({
          agentType: body.agentType as AgentType,
          eventId: body.eventId,
          actorId: userId,
          task: body.task,
          context: body.context,
          maxTurns: body.maxTurns,
          maxBudgetUsd: body.maxBudgetUsd,
        });

        return reply.send({ data: result });
      } finally {
        const count = activeAgents.get(body.eventId) ?? 1;
        if (count <= 1) activeAgents.delete(body.eventId);
        else activeAgents.set(body.eventId, count - 1);
      }
    },
  );

  // GET /api/v1/agents/status/:eventId — active agents for an event
  app.get<{ Params: { eventId: string } }>(
    "/status/:eventId",
    { onRequest: [authenticate] },
    async (request) => {
      const active = activeAgents.get(request.params.eventId) ?? 0;
      return {
        data: {
          eventId: request.params.eventId,
          activeAgents: active,
          maxAgents: MAX_AGENTS_PER_EVENT,
        },
      };
    },
  );

  // POST /api/v1/agents/city-check — City Government Agent
  app.post(
    "/city-check",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const body = z
        .object({ eventId: z.string().uuid(), cityId: z.string().uuid() })
        .parse(request.body);

      const agent = new CityAgent(app.db);
      const result = await agent.checkEvent({ eventId: body.eventId, cityId: body.cityId });
      return { data: result };
    },
  );
};
