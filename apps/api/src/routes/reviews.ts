import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, avg, count, desc } from "drizzle-orm";
import { reviews, bookings, venues } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

export const reviewRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/venues/:id/reviews
  app.post<{ Params: { id: string } }>(
    "/:id/reviews",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = createReviewSchema.parse(request.body);
      const { userId } = request.jwtPayload;
      const venueId = request.params.id;

      // Verify venue exists
      const venue = await app.db.query.venues.findFirst({
        where: eq(venues.id, venueId),
        columns: { id: true },
      });
      if (!venue) throw app.httpErrors.notFound("Venue not found");

      // Verify booking belongs to this user and is completed
      const booking = await app.db.query.bookings.findFirst({
        where: and(
          eq(bookings.id, body.bookingId),
          eq(bookings.entityType, "venue"),
          eq(bookings.entityId, venueId),
        ),
      });
      if (!booking) throw app.httpErrors.notFound("Booking not found for this venue");
      if (booking.status !== "completed") {
        throw app.httpErrors.conflict("You can only review venues after a completed booking");
      }

      // Check existing review for this booking
      const existing = await app.db.query.reviews.findFirst({
        where: eq(reviews.bookingId, body.bookingId),
        columns: { id: true },
      });
      if (existing) {
        throw app.httpErrors.conflict("You have already reviewed this booking");
      }

      const [review] = await app.db
        .insert(reviews)
        .values({
          venueId,
          userId,
          bookingId: body.bookingId,
          eventId: booking.eventId,
          rating: body.rating,
          title: body.title,
          body: body.body,
        })
        .returning();

      reply.status(201).send({ data: review });
    },
  );

  // GET /api/v1/venues/:id/reviews
  app.get<{ Params: { id: string } }>(
    "/:id/reviews",
    { onRequest: [authenticate] },
    async (request) => {
      const venueId = request.params.id;

      const rows = await app.db.query.reviews.findMany({
        where: eq(reviews.venueId, venueId),
        orderBy: [desc(reviews.createdAt)],
        limit: 20,
      });

      const [aggregates] = await app.db
        .select({
          averageRating: avg(reviews.rating),
          totalReviews: count(reviews.id),
        })
        .from(reviews)
        .where(eq(reviews.venueId, venueId));

      return {
        data: rows,
        meta: {
          averageRating: aggregates?.averageRating
            ? parseFloat(String(aggregates.averageRating))
            : null,
          totalReviews: Number(aggregates?.totalReviews ?? 0),
        },
      };
    },
  );

  // GET /api/v1/venues/:id/rating — aggregate only
  app.get<{ Params: { id: string } }>(
    "/:id/rating",
    async (request) => {
      const venueId = request.params.id;

      const [aggregates] = await app.db
        .select({
          averageRating: avg(reviews.rating),
          totalReviews: count(reviews.id),
        })
        .from(reviews)
        .where(eq(reviews.venueId, venueId));

      return {
        data: {
          venueId,
          averageRating: aggregates?.averageRating
            ? parseFloat(String(aggregates.averageRating))
            : null,
          totalReviews: Number(aggregates?.totalReviews ?? 0),
        },
      };
    },
  );
};
