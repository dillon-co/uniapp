import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { sponsorships, events } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const createSchema = z.object({
  sponsorId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  type: z.enum(["financial", "in_kind", "media"]).default("financial"),
  benefits: z
    .array(z.object({ benefit: z.string(), description: z.string() }))
    .default([]),
  notes: z.string().optional(),
  contractUrl: z.string().url().optional(),
});

const paySchema = z.object({
  paymentMethod: z.string().default("invoice"),
});

export const sponsorshipRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:eventId/sponsorships
  app.get<{ Params: { eventId: string } }>(
    "/:eventId/sponsorships",
    { onRequest: [authenticate] },
    async (request) => {
      const rows = await app.db.query.sponsorships.findMany({
        where: eq(sponsorships.eventId, request.params.eventId),
      });
      return { data: rows };
    },
  );

  // POST /api/v1/events/:eventId/sponsorships
  app.post<{ Params: { eventId: string } }>(
    "/:eventId/sponsorships",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = createSchema.parse(request.body);

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.eventId),
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const [sponsorship] = await app.db
        .insert(sponsorships)
        .values({
          sponsorId: body.sponsorId,
          eventId: request.params.eventId,
          amountCents: body.amountCents,
          type: body.type,
          benefits: body.benefits,
          paymentStatus: "pending",
          notes: body.notes ?? null,
          contractUrl: body.contractUrl ?? null,
        })
        .returning();

      reply.status(201).send({ data: sponsorship });
    },
  );

  // POST /api/v1/events/:eventId/sponsorships/:id/pay
  app.post<{ Params: { eventId: string; id: string } }>(
    "/:eventId/sponsorships/:id/pay",
    { onRequest: [authenticate] },
    async (request) => {
      const body = paySchema.parse(request.body);

      const sponsorship = await app.db.query.sponsorships.findFirst({
        where: eq(sponsorships.id, request.params.id),
      });
      if (!sponsorship) throw app.httpErrors.notFound("Sponsorship not found");
      if (sponsorship.paymentStatus === "paid") {
        throw app.httpErrors.conflict("Sponsorship already paid");
      }

      const [updated] = await app.db
        .update(sponsorships)
        .set({ paymentStatus: "paid", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(sponsorships.id, request.params.id))
        .returning();

      return { data: { sponsorship: updated, paymentMethod: body.paymentMethod } };
    },
  );

  // DELETE /api/v1/events/:eventId/sponsorships/:id
  app.delete<{ Params: { eventId: string; id: string } }>(
    "/:eventId/sponsorships/:id",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const sponsorship = await app.db.query.sponsorships.findFirst({
        where: eq(sponsorships.id, request.params.id),
      });
      if (!sponsorship) throw app.httpErrors.notFound("Sponsorship not found");
      if (sponsorship.paymentStatus === "paid") {
        throw app.httpErrors.badRequest("Cannot delete a paid sponsorship");
      }

      await app.db.delete(sponsorships).where(eq(sponsorships.id, request.params.id));
      reply.status(204).send();
    },
  );
};
