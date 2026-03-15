import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { reviews, bookings, negotiations, verifications, users } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

type Db = Parameters<FastifyPluginAsync>[0]["db"];

const entityTypeSchema = z.enum(["user", "vendor", "venue", "organization"]);

async function computeEntityTrustScore(
  db: Db,
  entityType: string,
  entityId: string,
): Promise<{ score: number; breakdown: Record<string, number> }> {
  // 1. Review rating average — for venues, use venueId; for others default to 3
  let reviewRows: Array<{ rating: number }> = [];
  if (entityType === "venue") {
    reviewRows = await db.query.reviews.findMany({
      where: eq(reviews.venueId, entityId),
      columns: { rating: true },
    });
  }
  const avgRating =
    reviewRows.length > 0
      ? reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length
      : 3;
  const reviewScore = Math.round(((avgRating - 1) / 4) * 100);

  // 2. Booking completion rate
  const allBookings = await db.query.bookings.findMany({
    where: eq(bookings.entityId, entityId),
    columns: { status: true },
  });
  const completedBookings = allBookings.filter((b) => b.status === "completed").length;
  const bookingCompletionRate =
    allBookings.length > 0 ? (completedBookings / allBookings.length) * 100 : 50;

  // 3. Negotiation success rate
  const allNegotiations = await db.query.negotiations.findMany({
    where: eq(negotiations.responderId, entityId),
    columns: { status: true },
  });
  const resolvedNegotiations = allNegotiations.filter((n) => n.status === "resolved").length;
  const negotiationSuccessRate =
    allNegotiations.length > 0
      ? (resolvedNegotiations / allNegotiations.length) * 100
      : 50;

  // 4. Verification status
  const verificationRows = await db.query.verifications.findMany({
    where: and(
      eq(verifications.entityType, entityType),
      eq(verifications.entityId, entityId),
    ),
    columns: { status: true },
  });
  const verifiedCount = verificationRows.filter((v) => v.status === "verified").length;
  const verificationScore =
    verificationRows.length > 0 ? (verifiedCount / verificationRows.length) * 100 : 0;

  const score = Math.round(
    reviewScore * 0.4 +
      bookingCompletionRate * 0.3 +
      negotiationSuccessRate * 0.2 +
      verificationScore * 0.1,
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      reviewScore,
      bookingCompletionRate: Math.round(bookingCompletionRate),
      negotiationSuccessRate: Math.round(negotiationSuccessRate),
      verificationScore: Math.round(verificationScore),
      reviewCount: reviewRows.length,
      bookingCount: allBookings.length,
      negotiationCount: allNegotiations.length,
    },
  };
}

export const trustRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/trust/compute/:entityType/:entityId
  app.post<{ Params: { entityType: string; entityId: string } }>(
    "/compute/:entityType/:entityId",
    { onRequest: [authenticate] },
    async (request) => {
      const { entityType, entityId } = z
        .object({ entityType: entityTypeSchema, entityId: z.string().uuid() })
        .parse(request.params);

      const result = await computeEntityTrustScore(app.db, entityType, entityId);

      // Update trust score if entity is a user
      if (entityType === "user") {
        await app.db
          .update(users)
          .set({ trustScore: result.score })
          .where(eq(users.id, entityId));
      }

      return {
        data: {
          entityType,
          entityId,
          ...result,
          computedAt: new Date().toISOString(),
        },
      };
    },
  );

  // POST /api/v1/trust/compute-batch — background computation for all users
  app.post("/compute-batch", { onRequest: [authenticate] }, async (request) => {
    const { roles } = request.jwtPayload;
    if (!roles.includes("platform_admin")) {
      throw app.httpErrors.forbidden("Admin only");
    }

    const allUsers = await app.db.query.users.findMany({
      columns: { id: true },
      limit: 100,
    });

    const results = await Promise.all(
      allUsers.map(async (user) => {
        const result = await computeEntityTrustScore(app.db, "user", user.id);
        await app.db
          .update(users)
          .set({ trustScore: result.score })
          .where(eq(users.id, user.id));
        return { entityId: user.id, score: result.score };
      }),
    );

    return { data: { processed: results.length, results } };
  });

  // GET /api/v1/trust/:entityType/:entityId
  app.get<{ Params: { entityType: string; entityId: string } }>(
    "/:entityType/:entityId",
    { onRequest: [authenticate] },
    async (request) => {
      const { entityType, entityId } = z
        .object({ entityType: entityTypeSchema, entityId: z.string().uuid() })
        .parse(request.params);

      const result = await computeEntityTrustScore(app.db, entityType, entityId);
      return {
        data: {
          entityType,
          entityId,
          ...result,
          computedAt: new Date().toISOString(),
        },
      };
    },
  );
};
