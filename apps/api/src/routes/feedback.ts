import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authenticate, requireRoles } from "../middleware/auth.js";

const submitFeedbackSchema = z.object({
  message: z.string().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  page: z.string().max(255).optional(),
  category: z
    .enum(["bug", "feature", "ux", "performance", "general"])
    .optional()
    .default("general"),
});

interface FeedbackEntry {
  id: string;
  userId: string;
  email: string;
  message: string;
  rating: number;
  page: string | undefined;
  category: string;
  submittedAt: string;
}

// In-memory store (beta only — replace with DB table in GA)
const feedbackStore: FeedbackEntry[] = [];

export const feedbackRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/feedback — submit feedback (authenticated)
  app.post(
    "/",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const body = submitFeedbackSchema.parse(request.body);
      const { userId, email } = request.jwtPayload;

      const entry: FeedbackEntry = {
        id: crypto.randomUUID(),
        userId,
        email,
        message: body.message,
        rating: body.rating,
        page: body.page,
        category: body.category,
        submittedAt: new Date().toISOString(),
      };

      feedbackStore.push(entry);

      app.log.info(
        { feedbackId: entry.id, userId, rating: body.rating, category: body.category },
        "Beta feedback received",
      );

      reply.status(201).send({
        data: { id: entry.id, message: "Thank you for your feedback!" },
      });
    },
  );

  // GET /api/v1/feedback — list feedback (admin only)
  app.get(
    "/",
    { onRequest: [requireRoles("platform_admin")] },
    async (request) => {
      const url = request.url;
      const searchParams = new URL(url, "http://localhost").searchParams;
      const page = parseInt(searchParams.get("page") ?? "1", 10);
      const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
      const offset = (page - 1) * limit;

      const items = feedbackStore.slice(offset, offset + limit);

      return {
        data: items,
        meta: {
          total: feedbackStore.length,
          page,
          limit,
          pages: Math.ceil(feedbackStore.length / limit),
        },
      };
    },
  );
};
