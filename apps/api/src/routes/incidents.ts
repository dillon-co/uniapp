import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { incidents, events } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const createSchema = z.object({
  type: z.enum(["medical", "security", "fire", "crowd_control", "equipment", "weather", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
  description: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateSchema = z.object({
  status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
  response: z.string().max(5000).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:eventId/incidents
  app.get<{ Params: { eventId: string } }>(
    "/:eventId/incidents",
    { onRequest: [authenticate] },
    async (request) => {
      const rows = await app.db.query.incidents.findMany({
        where: eq(incidents.eventId, request.params.eventId),
        orderBy: [desc(incidents.createdAt)],
      });
      return { data: rows };
    },
  );

  // POST /api/v1/events/:eventId/incidents
  app.post<{ Params: { eventId: string } }>(
    "/:eventId/incidents",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = createSchema.parse(request.body);
      const { userId } = request.jwtPayload;

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.eventId),
        columns: { id: true },
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const [incident] = await app.db
        .insert(incidents)
        .values({
          eventId: request.params.eventId,
          reporterId: userId,
          type: body.type,
          severity: body.severity,
          description: body.description,
          status: "open",
          metadata: body.metadata ?? {},
        })
        .returning();

      // Broadcast via WS if critical or high severity
      if (body.severity === "critical" || body.severity === "high") {
        app.broadcast(
          `event:${request.params.eventId}`,
          "incident",
          { incidentId: incident!.id, severity: body.severity, type: body.type },
        );
      }

      reply.status(201).send({ data: incident });
    },
  );

  // PATCH /api/v1/events/:eventId/incidents/:incidentId
  app.patch<{ Params: { eventId: string; incidentId: string } }>(
    "/:eventId/incidents/:incidentId",
    { onRequest: [authenticate] },
    async (request) => {
      const body = updateSchema.parse(request.body);

      const incident = await app.db.query.incidents.findFirst({
        where: eq(incidents.id, request.params.incidentId),
      });
      if (!incident) throw app.httpErrors.notFound("Incident not found");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.status) {
        updates.status = body.status;
        if (body.status === "resolved" || body.status === "closed") {
          updates.resolvedAt = new Date();
        }
      }
      if (body.response !== undefined) updates.response = body.response;
      if (body.severity) updates.severity = body.severity;

      const [updated] = await app.db
        .update(incidents)
        .set(updates)
        .where(eq(incidents.id, request.params.incidentId))
        .returning();

      return { data: updated };
    },
  );

  // GET /api/v1/events/:eventId/incidents/:incidentId
  app.get<{ Params: { eventId: string; incidentId: string } }>(
    "/:eventId/incidents/:incidentId",
    { onRequest: [authenticate] },
    async (request) => {
      const incident = await app.db.query.incidents.findFirst({
        where: eq(incidents.id, request.params.incidentId),
      });
      if (!incident) throw app.httpErrors.notFound("Incident not found");
      return { data: incident };
    },
  );
};
