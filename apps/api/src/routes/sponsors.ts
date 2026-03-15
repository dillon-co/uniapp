import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { sponsors, events } from "@uniapp/db";
import { SponsorAgent, RiskAssessor } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

const createSponsorSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  categories: z.array(z.string()).default([]),
  budgetCents: z.number().int().min(0),
  targetEventTypes: z.array(z.string()).default([]),
  contactEmail: z.string().email().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
});

const updateSponsorSchema = createSponsorSchema.partial().omit({ orgId: true });

export const sponsorRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/sponsors
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const { active } = z.object({ active: z.string().optional() }).parse(request.query);

    const rows = active !== undefined
      ? await app.db.query.sponsors.findMany({
          where: eq(sponsors.active, active),
          limit: 100,
        })
      : await app.db.query.sponsors.findMany({ limit: 100 });

    return { data: rows };
  });

  // POST /api/v1/sponsors
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createSponsorSchema.parse(request.body);

    const [sponsor] = await app.db
      .insert(sponsors)
      .values({
        orgId: body.orgId,
        name: body.name,
        categories: body.categories,
        budgetCents: body.budgetCents,
        targetEventTypes: body.targetEventTypes,
        contactEmail: body.contactEmail ?? null,
        website: body.website ?? null,
        logoUrl: body.logoUrl ?? null,
        description: body.description ?? null,
        active: "true",
      })
      .returning();

    reply.status(201).send({ data: sponsor });
  });

  // GET /api/v1/sponsors/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const sponsor = await app.db.query.sponsors.findFirst({
        where: eq(sponsors.id, request.params.id),
      });
      if (!sponsor) throw app.httpErrors.notFound("Sponsor not found");
      return { data: sponsor };
    },
  );

  // PATCH /api/v1/sponsors/:id
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const body = updateSponsorSchema.parse(request.body);

      const sponsor = await app.db.query.sponsors.findFirst({
        where: eq(sponsors.id, request.params.id),
      });
      if (!sponsor) throw app.httpErrors.notFound("Sponsor not found");

      const [updated] = await app.db
        .update(sponsors)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(sponsors.id, request.params.id))
        .returning();

      return { data: updated };
    },
  );

  // DELETE /api/v1/sponsors/:id
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const sponsor = await app.db.query.sponsors.findFirst({
        where: eq(sponsors.id, request.params.id),
      });
      if (!sponsor) throw app.httpErrors.notFound("Sponsor not found");

      await app.db
        .update(sponsors)
        .set({ active: "false", updatedAt: new Date() })
        .where(eq(sponsors.id, request.params.id));

      reply.status(204).send();
    },
  );

  // POST /api/v1/events/:eventId/find-sponsors — AI sponsor matching
  app.post<{ Params: { eventId: string } }>(
    "/events/:eventId/find-sponsors",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.eventId),
        columns: { id: true },
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const agent = new SponsorAgent(app.db);
      const result = await agent.findSponsors(request.params.eventId);
      return { data: result };
    },
  );
};
