import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { negotiations } from "@uniapp/db";
import { NegotiationEngine } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

const initiateSchema = z.object({
  eventId: z.string().uuid(),
  responderId: z.string().uuid(),
  responderType: z.enum(["venue", "vendor"]),
  subject: z.string().min(1).max(255),
  initialProposal: z.object({
    priceCents: z.number().int().min(0),
    terms: z.record(z.string(), z.unknown()).default({}),
    notes: z.string().optional(),
    validUntil: z.string().datetime().optional(),
  }),
});

const respondSchema = z.object({
  action: z.enum(["accept", "reject", "counter"]),
  response: z.object({
    priceCents: z.number().int().min(0),
    terms: z.record(z.string(), z.unknown()).default({}),
    notes: z.string().optional(),
    validUntil: z.string().datetime().optional(),
  }).optional(),
});

export const negotiationRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/negotiations — initiate a negotiation
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = initiateSchema.parse(request.body);
    const { userId } = request.jwtPayload;

    const engine = new NegotiationEngine(app.db);
    const { negotiationId } = await engine.initiate({
      eventId: body.eventId,
      initiatorId: userId,
      initiatorType: "organizer",
      responderId: body.responderId,
      responderType: body.responderType,
      subject: body.subject,
      initialProposal: body.initialProposal,
    });

    const neg = await app.db.query.negotiations.findFirst({
      where: eq(negotiations.id, negotiationId),
    });

    reply.status(201).send({ data: neg });
  });

  // GET /api/v1/negotiations/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const neg = await app.db.query.negotiations.findFirst({
        where: eq(negotiations.id, request.params.id),
      });
      if (!neg) throw app.httpErrors.notFound("Negotiation not found");
      return { data: neg };
    },
  );

  // GET /api/v1/negotiations — list negotiations for an event
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.query);

    const rows = await app.db.query.negotiations.findMany({
      where: eq(negotiations.eventId, eventId),
    });
    return { data: rows };
  });

  // POST /api/v1/negotiations/:id/respond — submit a round response
  app.post<{ Params: { id: string } }>(
    "/:id/respond",
    { onRequest: [authenticate] },
    async (request) => {
      const body = respondSchema.parse(request.body);
      const { userId } = request.jwtPayload;

      const engine = new NegotiationEngine(app.db);
      const result = await engine.submitResponse(request.params.id, {
        responderId: userId,
        action: body.action,
        response: body.response,
      });

      const neg = await app.db.query.negotiations.findFirst({
        where: eq(negotiations.id, request.params.id),
      });

      return { data: { ...neg, ...result } };
    },
  );

  // POST /api/v1/negotiations/:id/ai-counter — let AI generate counter
  app.post<{ Params: { id: string } }>(
    "/:id/ai-counter",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }

      const engine = new NegotiationEngine(app.db);
      const counter = await engine.generateCounterProposal(request.params.id);
      return { data: counter };
    },
  );
};
