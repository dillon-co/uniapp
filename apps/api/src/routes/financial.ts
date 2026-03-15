import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { bookings, payments, events, settlements } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

export const financialRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:id/financial — financial summary for an event
  app.get<{ Params: { id: string } }>(
    "/:id/financial",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.id),
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const allBookings = await app.db.query.bookings.findMany({
        where: eq(bookings.eventId, request.params.id),
      });

      const confirmedBookings = allBookings.filter((b) =>
        ["confirmed", "completed"].includes(b.status),
      );

      // Total spend = all confirmed booking amounts
      const totalSpendCents = confirmedBookings.reduce((sum, b) => sum + b.priceCents, 0);

      // Outstanding payments
      const unpaidBookings = confirmedBookings.filter((b) => !b.paidAt);
      const outstandingCents = unpaidBookings.reduce((sum, b) => sum + b.priceCents, 0);

      // Breakdown by entity type
      const breakdown: Record<string, { count: number; totalCents: number }> = {};
      for (const b of confirmedBookings) {
        const key = b.entityType;
        if (!breakdown[key]) breakdown[key] = { count: 0, totalCents: 0 };
        breakdown[key]!.count++;
        breakdown[key]!.totalCents += b.priceCents;
      }

      // Settlement status
      const settlement = await app.db.query.settlements.findFirst({
        where: eq(settlements.eventId, request.params.id),
      });

      return {
        data: {
          eventId: request.params.id,
          totalRevenueCents: 0, // ticket revenue would come from a ticketing system
          totalSpendCents,
          netCents: -totalSpendCents,
          outstandingCents,
          breakdown,
          settlementStatus: settlement?.status ?? "not_settled",
          bookingCount: allBookings.length,
          confirmedBookingCount: confirmedBookings.length,
          unpaidBookingCount: unpaidBookings.length,
        },
      };
    },
  );

  // POST /api/v1/events/:id/settle — mark all confirmed bookings as completed, create settlement
  app.post<{ Params: { id: string } }>(
    "/:id/settle",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.id),
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const { userId, roles } = request.jwtPayload;
      const isAdmin = roles.includes("platform_admin");
      const isOwner = event.organizerId === userId;
      if (!isOwner && !isAdmin) throw app.httpErrors.forbidden("Access denied");

      if (["draft", "planning", "negotiating"].includes(event.status)) {
        throw app.httpErrors.badRequest("Event cannot be settled in its current status");
      }

      const confirmedBookings = await app.db.query.bookings.findMany({
        where: eq(bookings.eventId, request.params.id),
        columns: { id: true, status: true, priceCents: true, entityType: true, paidAt: true },
      });

      // Mark confirmed bookings as completed
      const toComplete = confirmedBookings.filter((b) => b.status === "confirmed");
      for (const b of toComplete) {
        await app.db
          .update(bookings)
          .set({ status: "completed" })
          .where(eq(bookings.id, b.id));
      }

      const allCompleted = [...toComplete, ...confirmedBookings.filter((b) => b.status === "completed")];
      const totalSpendCents = allCompleted.reduce((sum, b) => sum + b.priceCents, 0);
      const unpaid = allCompleted.filter((b) => !b.paidAt);

      const breakdown: Record<string, { count: number; totalCents: number }> = {};
      for (const b of allCompleted) {
        if (!breakdown[b.entityType]) breakdown[b.entityType] = { count: 0, totalCents: 0 };
        breakdown[b.entityType]!.count++;
        breakdown[b.entityType]!.totalCents += b.priceCents;
      }

      // Upsert settlement record
      const [settlement] = await app.db
        .insert(settlements)
        .values({
          eventId: request.params.id,
          status: "completed",
          totalRevenueCents: 0,
          totalSpendCents,
          netCents: -totalSpendCents,
          breakdown,
          outstandingPayments: unpaid.map((b) => ({
            bookingId: b.id,
            amountCents: b.priceCents,
          })),
          settledAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settlements.eventId,
          set: {
            status: "completed",
            totalSpendCents,
            netCents: -totalSpendCents,
            breakdown,
            outstandingPayments: unpaid.map((b) => ({
              bookingId: b.id,
              amountCents: b.priceCents,
            })),
            settledAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();

      // Update event status to settled
      await app.db
        .update(events)
        .set({ status: "settled" })
        .where(eq(events.id, request.params.id));

      return {
        data: {
          settlement,
          completedBookings: toComplete.length,
          totalSpendCents,
          outstandingPaymentsCount: unpaid.length,
        },
      };
    },
  );
};
