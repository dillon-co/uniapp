import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, isNull, desc } from "drizzle-orm";
import { notifications } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const NOTIFICATION_TYPES = ["booking_update", "event_state", "agent_action", "system", "permit_update"] as const;
const NOTIFICATION_CHANNELS = ["in_app", "email", "sms", "push"] as const;

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(NOTIFICATION_CHANNELS).default("in_app"),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).default({}),
});

// Notification service helper (used by other routes/agents)
export async function createNotification(
  db: Parameters<FastifyPluginAsync>[0]["db"],
  payload: z.infer<typeof createNotificationSchema>,
): Promise<void> {
  await db.insert(notifications).values({
    ...payload,
    deliveredAt: payload.channel === "in_app" ? new Date() : undefined,
  });
  // TODO: fan out to email (SendGrid), SMS (Twilio), push (FCM) based on channel + user preferences
}

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/notifications — in-app notifications for current user
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const { unreadOnly } = z.object({
      unreadOnly: z.coerce.boolean().default(false),
    }).parse(request.query);

    const conditions = [eq(notifications.userId, request.jwtPayload.userId)];
    if (unreadOnly) conditions.push(isNull(notifications.readAt));

    const rows = await app.db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    });

    const unreadCount = rows.filter((n) => !n.readAt).length;

    return {
      data: rows,
      meta: { unreadCount },
    };
  });

  // PATCH /api/v1/notifications/:id/read
  app.patch<{ Params: { id: string } }>(
    "/:id/read",
    { onRequest: [authenticate] },
    async (request) => {
      const [updated] = await app.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, request.params.id),
            eq(notifications.userId, request.jwtPayload.userId),
          ),
        )
        .returning();

      if (!updated) throw app.httpErrors.notFound("Notification not found");
      return { data: updated };
    },
  );

  // POST /api/v1/notifications/read-all
  app.post("/read-all", { onRequest: [authenticate] }, async (request) => {
    await app.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, request.jwtPayload.userId),
          isNull(notifications.readAt),
        ),
      );

    return { data: { message: "All notifications marked as read" } };
  });

  // POST /api/v1/notifications — internal: create notification (admin/agent use)
  app.post(
    "/",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { roles } = request.jwtPayload;
      if (!roles.includes("platform_admin")) {
        throw app.httpErrors.forbidden("Only platform admins can create notifications directly");
      }
      const body = createNotificationSchema.parse(request.body);
      await createNotification(app.db, body);
      reply.status(201).send({ data: { message: "Notification created" } });
    },
  );
};
