import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, or, lte, gte, sql, desc } from "drizzle-orm";
import { bookings, venues, events, auditLog } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const BOOKING_STATUSES = ["pending", "approved", "confirmed", "completed", "rejected", "cancelled"] as const;

const createBookingSchema = z.object({
  eventId: z.string().uuid(),
  entityType: z.enum(["venue", "vendor"]),
  entityId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  priceCents: z.number().int().min(0),
  depositCents: z.number().int().min(0).default(0),
  terms: z.record(z.string(), z.unknown()).default({}),
});

const respondSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

export const bookingRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/bookings — create a booking request
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createBookingSchema.parse(request.body);
    const { userId, roles } = request.jwtPayload;

    // Verify event belongs to requester (or admin)
    const event = await app.db.query.events.findFirst({
      where: eq(events.id, body.eventId),
      columns: { id: true, organizerId: true, cityId: true, status: true },
    });
    if (!event) throw app.httpErrors.notFound("Event not found");

    const isAdmin = roles.includes("platform_admin") || roles.includes("city_admin");
    if (event.organizerId !== userId && !isAdmin) {
      throw app.httpErrors.forbidden("Only the event organizer can create bookings");
    }

    if (["cancelled", "completed", "settled"].includes(event.status)) {
      throw app.httpErrors.conflict(`Cannot book for event in ${event.status} status`);
    }

    // Conflict detection — check overlapping bookings for same entity
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    const conflict = await app.db.query.bookings.findFirst({
      where: and(
        eq(bookings.entityType, body.entityType),
        eq(bookings.entityId, body.entityId),
        lte(bookings.startDate, endDate),
        gte(bookings.endDate, startDate),
        sql`${bookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    });

    if (conflict) {
      throw app.httpErrors.conflict(
        `${body.entityType} is already booked for this date range (booking: ${conflict.id})`,
      );
    }

    const [booking] = await app.db
      .insert(bookings)
      .values({
        eventId: body.eventId,
        entityType: body.entityType,
        entityId: body.entityId,
        status: "pending",
        terms: body.terms,
        priceCents: body.priceCents,
        depositCents: body.depositCents,
        startDate,
        endDate,
      })
      .returning();

    // Audit log
    await app.db.insert(auditLog).values({
      eventId: body.eventId,
      agentType: "user",
      agentEntityId: userId,
      action: "booking_created",
      input: body as unknown as Record<string, unknown>,
      output: { bookingId: booking!.id },
    });

    reply.status(201).send({ data: booking });
  });

  // GET /api/v1/bookings — list bookings I'm involved in
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const { userId, roles } = request.jwtPayload;
    const isAdmin = roles.includes("platform_admin") || roles.includes("city_admin");

    // Admins see all; organizers see their event bookings; venue managers see their venue bookings
    let rows;
    if (isAdmin) {
      rows = await app.db.query.bookings.findMany({
        orderBy: [desc(bookings.createdAt)],
        limit: 50,
      });
    } else {
      // Get events owned by user → get their bookings
      const userEvents = await app.db.query.events.findMany({
        where: eq(events.organizerId, userId),
        columns: { id: true },
      });
      const eventIds = userEvents.map((e) => e.id);

      rows = eventIds.length > 0
        ? await app.db.query.bookings.findMany({
            where: sql`${bookings.eventId} = ANY(ARRAY[${sql.join(eventIds.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[])`,
            orderBy: [desc(bookings.createdAt)],
            limit: 50,
          })
        : [];
    }

    return { data: rows };
  });

  // GET /api/v1/bookings/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const booking = await app.db.query.bookings.findFirst({
        where: eq(bookings.id, request.params.id),
      });
      if (!booking) throw app.httpErrors.notFound("Booking not found");
      return { data: booking };
    },
  );

  // POST /api/v1/bookings/:id/respond — venue manager approve/reject
  app.post<{ Params: { id: string } }>(
    "/:id/respond",
    { onRequest: [authenticate] },
    async (request) => {
      const body = respondSchema.parse(request.body);
      const { userId, roles } = request.jwtPayload;

      const booking = await app.db.query.bookings.findFirst({
        where: eq(bookings.id, request.params.id),
      });
      if (!booking) throw app.httpErrors.notFound("Booking not found");

      if (booking.status !== "pending") {
        throw app.httpErrors.conflict(
          `Booking is already ${booking.status} — cannot respond`,
        );
      }

      // Venue manager or admin can respond
      const isAdmin = roles.includes("platform_admin") || roles.includes("city_admin");
      const isVenueManager = roles.includes("venue_manager");
      if (!isAdmin && !isVenueManager) {
        throw app.httpErrors.forbidden("Only venue managers can respond to bookings");
      }

      const newStatus = body.action === "approve" ? "approved" : "rejected";

      const [updated] = await app.db
        .update(bookings)
        .set({
          status: newStatus,
          confirmedAt: newStatus === "approved" ? new Date() : null,
        })
        .where(eq(bookings.id, booking.id))
        .returning();

      await app.db.insert(auditLog).values({
        eventId: booking.eventId,
        agentType: "user",
        agentEntityId: userId,
        action: `booking_${newStatus}`,
        input: { bookingId: booking.id, note: body.note },
        output: { status: newStatus },
      });

      return { data: updated };
    },
  );

  // POST /api/v1/bookings/:id/confirm — organizer confirms an approved booking
  app.post<{ Params: { id: string } }>(
    "/:id/confirm",
    { onRequest: [authenticate] },
    async (request) => {
      const booking = await app.db.query.bookings.findFirst({
        where: eq(bookings.id, request.params.id),
      });
      if (!booking) throw app.httpErrors.notFound("Booking not found");
      if (booking.status !== "approved") {
        throw app.httpErrors.conflict("Booking must be approved before confirming");
      }

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, booking.eventId),
        columns: { organizerId: true },
      });
      const isOwner = event?.organizerId === request.jwtPayload.userId;
      const isAdmin = request.jwtPayload.roles.includes("platform_admin");
      if (!isOwner && !isAdmin) throw app.httpErrors.forbidden("Access denied");

      const [updated] = await app.db
        .update(bookings)
        .set({ status: "confirmed", confirmedAt: new Date() })
        .where(eq(bookings.id, booking.id))
        .returning();

      return { data: updated };
    },
  );

  // POST /api/v1/bookings/:id/cancel
  app.post<{ Params: { id: string } }>(
    "/:id/cancel",
    { onRequest: [authenticate] },
    async (request) => {
      const booking = await app.db.query.bookings.findFirst({
        where: eq(bookings.id, request.params.id),
      });
      if (!booking) throw app.httpErrors.notFound("Booking not found");

      if (["cancelled", "rejected", "completed"].includes(booking.status)) {
        throw app.httpErrors.conflict(`Cannot cancel a ${booking.status} booking`);
      }

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, booking.eventId),
        columns: { organizerId: true },
      });
      const isOwner = event?.organizerId === request.jwtPayload.userId;
      const isAdmin = request.jwtPayload.roles.includes("platform_admin");
      if (!isOwner && !isAdmin) throw app.httpErrors.forbidden("Access denied");

      const [updated] = await app.db
        .update(bookings)
        .set({ status: "cancelled" })
        .where(eq(bookings.id, booking.id))
        .returning();

      return { data: updated };
    },
  );
};
