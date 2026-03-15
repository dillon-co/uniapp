import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { permits, events } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";
import { PermitAgent } from "@uniapp/agents";

const createSchema = z.object({
  cityId: z.string().uuid(),
  type: z.enum(["noise", "assembly", "food", "alcohol", "street_closure", "fire_safety"]),
  applicationData: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z
    .enum(["draft", "submitted", "under_review", "approved", "rejected", "expired"])
    .optional(),
  applicationData: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const permitRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:eventId/permits — list permits for event
  app.get<{ Params: { eventId: string } }>(
    "/:eventId/permits",
    { onRequest: [authenticate] },
    async (request) => {
      const rows = await app.db.query.permits.findMany({
        where: eq(permits.eventId, request.params.eventId),
      });
      return { data: rows };
    },
  );

  // POST /api/v1/events/:eventId/permits — create permit
  app.post<{ Params: { eventId: string } }>(
    "/:eventId/permits",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = createSchema.parse(request.body);

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.eventId),
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const trackingNumber = `PERMIT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const [permit] = await app.db
        .insert(permits)
        .values({
          eventId: request.params.eventId,
          cityId: body.cityId,
          type: body.type,
          status: "draft",
          applicationData: body.applicationData,
          trackingNumber,
          notes: body.notes ?? null,
        })
        .returning();

      reply.status(201).send({ data: permit });
    },
  );

  // PATCH /api/v1/events/:eventId/permits/:permitId
  app.patch<{ Params: { eventId: string; permitId: string } }>(
    "/:eventId/permits/:permitId",
    { onRequest: [authenticate] },
    async (request) => {
      const body = updateSchema.parse(request.body);

      const permit = await app.db.query.permits.findFirst({
        where: and(
          eq(permits.id, request.params.permitId),
          eq(permits.eventId, request.params.eventId),
        ),
      });
      if (!permit) throw app.httpErrors.notFound("Permit not found");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.status) {
        updates.status = body.status;
        if (body.status === "submitted") updates.submittedAt = new Date();
        if (body.status === "approved") updates.approvedAt = new Date();
      }
      if (body.applicationData) updates.applicationData = body.applicationData;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.expiresAt) updates.expiresAt = new Date(body.expiresAt);

      const [updated] = await app.db
        .update(permits)
        .set(updates)
        .where(eq(permits.id, request.params.permitId))
        .returning();

      return { data: updated };
    },
  );

  // DELETE /api/v1/events/:eventId/permits/:permitId
  app.delete<{ Params: { eventId: string; permitId: string } }>(
    "/:eventId/permits/:permitId",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const permit = await app.db.query.permits.findFirst({
        where: and(
          eq(permits.id, request.params.permitId),
          eq(permits.eventId, request.params.eventId),
        ),
      });
      if (!permit) throw app.httpErrors.notFound("Permit not found");
      if (permit.status !== "draft") {
        throw app.httpErrors.badRequest("Only draft permits can be deleted");
      }

      await app.db.delete(permits).where(eq(permits.id, request.params.permitId));
      reply.status(204).send();
    },
  );

  // POST /api/v1/events/:eventId/permits/generate — AI generates permit applications
  app.post<{ Params: { eventId: string } }>(
    "/:eventId/permits/generate",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const { cityId } = z.object({ cityId: z.string().uuid() }).parse(request.body);

      const agent = new PermitAgent(app.db);
      const result = await agent.generatePermitApplications({
        eventId: request.params.eventId,
        cityId,
      });

      const createdPermits = await agent.createPermitRecords(
        { eventId: request.params.eventId, cityId },
        result.permits,
      );

      return {
        data: {
          ...result,
          createdPermits,
        },
      };
    },
  );
};
