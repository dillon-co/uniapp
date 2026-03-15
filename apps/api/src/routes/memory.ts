import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { MemoryStore, type MemoryType } from "@uniapp/agents";
import { authenticate, requireRoles } from "../middleware/auth.js";

const saveMemorySchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  memoryType: z.enum([
    "booking_outcome", "pricing_history", "preference",
    "reliability_score", "capacity_pattern", "negotiation_outcome",
    "event_type_preference", "general",
  ]),
  content: z.string().min(1).max(5000),
});

const recallQuerySchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
  memoryType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const memoryRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/memory — save a memory (agent/admin use)
  app.post(
    "/",
    { onRequest: [requireRoles("platform_admin")] },
    async (request, reply) => {
      const body = saveMemorySchema.parse(request.body);
      const store = new MemoryStore(app.db);
      await store.save(body);
      reply.status(201).send({ data: { message: "Memory saved" } });
    },
  );

  // GET /api/v1/memory — recall memories for an entity
  app.get(
    "/",
    { onRequest: [authenticate] },
    async (request) => {
      const query = recallQuerySchema.parse(request.query);
      const store = new MemoryStore(app.db);
      const memories = await store.recall({ ...query, memoryType: query.memoryType as MemoryType | undefined });
      return { data: memories };
    },
  );

  // GET /api/v1/memory/context — synthesized context string for agent prompts
  app.get(
    "/context",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const { entityType, entityId, task } = z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        task: z.string().min(1).max(500),
      }).parse(request.query);

      const store = new MemoryStore(app.db);
      const context = await store.buildContext({ entityType, entityId, currentTask: task });

      return { data: { context } };
    },
  );

  // DELETE /api/v1/memory/prune — prune old memories (admin)
  app.delete(
    "/prune",
    { onRequest: [requireRoles("platform_admin")] },
    async (_request, reply) => {
      const store = new MemoryStore(app.db);
      const deleted = await store.prune();
      reply.send({ data: { deleted, message: `Pruned ${deleted} old memories` } });
    },
  );
};
