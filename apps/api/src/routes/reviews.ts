import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, avg, count, desc } from "drizzle-orm";
import { reviews, bookings, venues } from "@uniapp/db";
import Anthropic from "@anthropic-ai/sdk";
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

  // GET /api/v1/venues/reviews/fraud-check — analyze suspicious reviews using Claude
  app.get(
    "/reviews/fraud-check",
    { onRequest: [authenticate] },
    async (request) => {
      const { roles } = request.jwtPayload;
      if (!roles.includes("platform_admin") && !roles.includes("city_admin")) {
        throw app.httpErrors.forbidden("Admin required");
      }

      const allReviews = await app.db.query.reviews.findMany({
        columns: { id: true, rating: true, title: true, body: true, createdAt: true, venueId: true },
        limit: 200,
        orderBy: [desc(reviews.createdAt)],
      });

      // Group by venue for analysis
      const byVenue = new Map<string, typeof allReviews>();
      for (const review of allReviews) {
        const existing = byVenue.get(review.venueId) ?? [];
        existing.push(review);
        byVenue.set(review.venueId, existing);
      }

      const suspiciousVenues: Array<{
        venueId: string;
        reviewCount: number;
        allFiveStars: boolean;
        identicalTextPattern: boolean;
        fraudScore: number;
        reason: string;
      }> = [];

      for (const [venueId, venueReviews] of byVenue) {
        if (venueReviews.length < 3) continue;

        const allFiveStars = venueReviews.every((r) => r.rating === 5);
        const bodies = venueReviews.map((r) => r.body ?? "").filter(Boolean);

        // Simple heuristic: check for identical or very similar text patterns
        const uniqueBodies = new Set(bodies);
        const identicalTextPattern = uniqueBodies.size < bodies.length * 0.5 && bodies.length >= 3;

        if (allFiveStars && identicalTextPattern) {
          suspiciousVenues.push({
            venueId,
            reviewCount: venueReviews.length,
            allFiveStars,
            identicalTextPattern,
            fraudScore: 85,
            reason: "All 5-star ratings with highly similar review text patterns",
          });
        } else if (allFiveStars && venueReviews.length >= 5) {
          suspiciousVenues.push({
            venueId,
            reviewCount: venueReviews.length,
            allFiveStars,
            identicalTextPattern,
            fraudScore: 60,
            reason: "Unusually high proportion of perfect 5-star ratings",
          });
        }
      }

      let aiAnalysis: string | null = null;
      if (process.env.ANTHROPIC_API_KEY && suspiciousVenues.length > 0) {
        try {
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          const resp = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 500,
            messages: [
              {
                role: "user",
                content: `Analyze these potentially fraudulent review patterns and provide a brief fraud assessment:
${JSON.stringify(suspiciousVenues, null, 2)}

Respond with 2-3 sentences summarizing the fraud risk and recommended actions.`,
              },
            ],
          });
          const text = resp.content.find((c: { type: string }) => c.type === "text") as { type: "text"; text: string } | undefined;
          if (text && text.type === "text") aiAnalysis = text.text;
        } catch {
          // AI not critical for this endpoint
        }
      }

      return {
        data: {
          totalReviewsAnalyzed: allReviews.length,
          suspiciousVenueCount: suspiciousVenues.length,
          suspiciousVenues,
          aiAnalysis,
          analyzedAt: new Date().toISOString(),
        },
      };
    },
  );
};
