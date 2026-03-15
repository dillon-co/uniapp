import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { bids, vendors, bookings, events } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const createBidSchema = z.object({
  vendorId: z.string().uuid(),
  eventId: z.string().uuid(),
  proposal: z.object({
    priceCents: z.number().int().min(0),
    quantity: z.number().int().min(1).default(1),
    deliveryTerms: z.string().max(500).optional(),
    conditions: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  }),
  autoAcceptThresholdCents: z.number().int().min(0).optional(),
});

const respondBidSchema = z.object({
  action: z.enum(["accept", "reject", "counter"]),
  counterProposal: z.object({
    priceCents: z.number().int().min(0),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
  }).optional(),
  note: z.string().max(500).optional(),
});

export const bidRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/bids — vendor or agent creates a bid
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createBidSchema.parse(request.body);

    const [bid] = await app.db
      .insert(bids)
      .values({
        vendorId: body.vendorId,
        eventId: body.eventId,
        status: "pending",
        proposal: body.proposal as unknown as Record<string, unknown>,
        autoAcceptThresholdCents: body.autoAcceptThresholdCents,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      })
      .returning();

    // Auto-accept check
    if (
      body.autoAcceptThresholdCents !== undefined &&
      body.proposal.priceCents <= body.autoAcceptThresholdCents
    ) {
      await app.db
        .update(bids)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(bids.id, bid!.id));
    }

    reply.status(201).send({ data: bid });
  });

  // GET /api/v1/bids — list bids (vendor sees theirs, organizer sees event bids)
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const { vendorId, eventId } = z.object({
      vendorId: z.string().uuid().optional(),
      eventId: z.string().uuid().optional(),
    }).parse(request.query);

    const conditions = [];
    if (vendorId) conditions.push(eq(bids.vendorId, vendorId));
    if (eventId) conditions.push(eq(bids.eventId, eventId));

    const rows = await app.db.query.bids.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(bids.createdAt)],
      limit: 50,
    });

    return { data: rows };
  });

  // GET /api/v1/bids/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const bid = await app.db.query.bids.findFirst({
        where: eq(bids.id, request.params.id),
      });
      if (!bid) throw app.httpErrors.notFound("Bid not found");
      return { data: bid };
    },
  );

  // POST /api/v1/bids/:id/respond — organizer accepts/rejects/counters
  app.post<{ Params: { id: string } }>(
    "/:id/respond",
    { onRequest: [authenticate] },
    async (request) => {
      const body = respondBidSchema.parse(request.body);
      const bid = await app.db.query.bids.findFirst({
        where: eq(bids.id, request.params.id),
      });
      if (!bid) throw app.httpErrors.notFound("Bid not found");
      if (!["pending", "countered"].includes(bid.status)) {
        throw app.httpErrors.conflict(`Cannot respond to a ${bid.status} bid`);
      }

      const newStatus =
        body.action === "accept" ? "accepted" :
        body.action === "reject" ? "rejected" : "countered";

      const [updated] = await app.db
        .update(bids)
        .set({
          status: newStatus,
          counterProposal: body.counterProposal as unknown as Record<string, unknown> | undefined,
          response: { action: body.action, note: body.note, respondedAt: new Date().toISOString() } as unknown as Record<string, unknown>,
          acceptedAt: body.action === "accept" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bid.id))
        .returning();

      // If accepted, create a confirmed booking
      if (body.action === "accept") {
        const proposal = bid.proposal as {
          priceCents: number;
          quantity: number;
          deliveryTerms?: string;
        };
        await app.db.insert(bookings).values({
          eventId: bid.eventId,
          entityType: "vendor",
          entityId: bid.vendorId,
          status: "confirmed",
          terms: bid.proposal as unknown as Record<string, unknown>,
          priceCents: proposal.priceCents,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // placeholder
          confirmedAt: new Date(),
        });
      }

      return { data: updated };
    },
  );

  // POST /api/v1/bids/:id/withdraw
  app.post<{ Params: { id: string } }>(
    "/:id/withdraw",
    { onRequest: [authenticate] },
    async (request) => {
      const [updated] = await app.db
        .update(bids)
        .set({ status: "withdrawn", updatedAt: new Date() })
        .where(
          and(eq(bids.id, request.params.id), sql`${bids.status} IN ('pending', 'countered')`),
        )
        .returning();
      if (!updated) throw app.httpErrors.notFound("Bid not found or already resolved");
      return { data: updated };
    },
  );
};
