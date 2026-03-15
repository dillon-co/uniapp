import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { payments, bookings } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const createIntentSchema = z.object({
  bookingId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("usd"),
  paymentMethod: z.string().default("card"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const confirmSchema = z.object({
  paymentIntentId: z.string(),
});

const refundSchema = z.object({
  reason: z.string().min(1).max(500),
  amountCents: z.number().int().positive().optional(),
});

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/payments/create-intent
  app.post("/create-intent", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createIntentSchema.parse(request.body);

    const booking = await app.db.query.bookings.findFirst({
      where: eq(bookings.id, body.bookingId),
    });
    if (!booking) throw app.httpErrors.notFound("Booking not found");

    // Create mock payment intent (Stripe-compatible structure)
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const [payment] = await app.db
      .insert(payments)
      .values({
        bookingId: body.bookingId,
        paymentIntentId,
        amountCents: body.amountCents,
        currency: body.currency,
        paymentMethod: body.paymentMethod,
        status: "pending",
        metadata: body.metadata ?? null,
      })
      .returning();

    reply.status(201).send({
      data: {
        ...payment,
        clientSecret: `${paymentIntentId}_secret_${Math.random().toString(36).slice(2, 16)}`,
      },
    });
  });

  // POST /api/v1/payments/confirm
  app.post("/confirm", { onRequest: [authenticate] }, async (request) => {
    const body = confirmSchema.parse(request.body);

    const payment = await app.db.query.payments.findFirst({
      where: eq(payments.paymentIntentId, body.paymentIntentId),
    });
    if (!payment) throw app.httpErrors.notFound("Payment intent not found");
    if (payment.status !== "pending") {
      throw app.httpErrors.badRequest(`Payment is already ${payment.status}`);
    }

    const chargeId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const [updated] = await app.db
      .update(payments)
      .set({
        status: "succeeded",
        stripeChargeId: chargeId,
        updatedAt: new Date(),
      })
      .where(eq(payments.paymentIntentId, body.paymentIntentId))
      .returning();

    // Update booking if linked
    if (payment.bookingId) {
      await app.db
        .update(bookings)
        .set({
          paidAt: new Date(),
          paymentIntentId: body.paymentIntentId,
          stripeChargeId: chargeId,
        })
        .where(eq(bookings.id, payment.bookingId));
    }

    return { data: updated };
  });

  // GET /api/v1/payments/booking/:bookingId
  app.get<{ Params: { bookingId: string } }>(
    "/booking/:bookingId",
    { onRequest: [authenticate] },
    async (request) => {
      const rows = await app.db.query.payments.findMany({
        where: eq(payments.bookingId, request.params.bookingId),
      });
      return { data: rows };
    },
  );

  // POST /api/v1/payments/:paymentId/refund
  app.post<{ Params: { paymentId: string } }>(
    "/:paymentId/refund",
    { onRequest: [authenticate] },
    async (request) => {
      const body = refundSchema.parse(request.body);

      const payment = await app.db.query.payments.findFirst({
        where: eq(payments.id, request.params.paymentId),
      });
      if (!payment) throw app.httpErrors.notFound("Payment not found");
      if (payment.status !== "succeeded") {
        throw app.httpErrors.badRequest("Only succeeded payments can be refunded");
      }

      const refundAmount = body.amountCents ?? payment.amountCents;
      const isPartial = refundAmount < payment.amountCents;

      const [updated] = await app.db
        .update(payments)
        .set({
          status: isPartial ? "partially_refunded" : "refunded",
          refundReason: body.reason,
          refundedAt: new Date(),
          refundAmountCents: refundAmount,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, request.params.paymentId))
        .returning();

      return { data: updated };
    },
  );
};
