import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { events, eventHistory } from "@uniapp/db";
import { EdlSchema, EdlPatchSchema } from "@uniapp/edl";
import { DemandForecaster, RiskAssessor } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

// Valid status transitions per the state machine
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["planning", "cancelled"],
  planning: ["negotiating", "cancelled"],
  negotiating: ["confirmed", "planning", "cancelled"],
  confirmed: ["live", "cancelled"],
  live: ["completed", "cancelled"],
  completed: ["settled"],
  settled: [],
  cancelled: [],
};

const EVENT_STATUSES = [
  "draft", "planning", "negotiating", "confirmed", "live", "completed", "settled", "cancelled",
] as const;

const createEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  type: z.string().min(1),
  cityId: z.string().uuid(),
  edl: EdlSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  attendanceMin: z.number().int().min(1).optional(),
  attendanceMax: z.number().int().min(1).optional(),
  budgetCents: z.number().int().min(0).optional(),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  attendanceMin: z.number().int().min(1).optional().nullable(),
  attendanceMax: z.number().int().min(1).optional().nullable(),
  budgetCents: z.number().int().min(0).optional().nullable(),
  edl: EdlPatchSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const transitionSchema = z.object({
  status: z.enum(EVENT_STATUSES),
  note: z.string().max(500).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(EVENT_STATUSES).optional(),
  type: z.string().optional(),
  cityId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const eventRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/events
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const { roles, userId } = request.jwtPayload;

    if (!roles.includes("organizer") && !roles.includes("platform_admin") && !roles.includes("city_admin")) {
      throw app.httpErrors.forbidden("Only organizers can create events");
    }

    const body = createEventSchema.parse(request.body);

    const [event] = await app.db
      .insert(events)
      .values({
        organizerId: userId,
        cityId: body.cityId,
        title: body.title,
        description: body.description,
        type: body.type,
        status: "draft",
        edl: body.edl,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        latitude: body.latitude,
        longitude: body.longitude,
        attendanceMin: body.attendanceMin ?? body.edl.attendance.min,
        attendanceMax: body.attendanceMax ?? body.edl.attendance.max,
        budgetCents: body.budgetCents ?? body.edl.budget?.totalCents,
        metadata: {},
      })
      .returning();

    // Record creation in history
    await app.db.insert(eventHistory).values({
      eventId: event!.id,
      actorId: userId,
      action: "state_change",
      fromStatus: null,
      toStatus: "draft",
      note: "Event created",
    });

    reply.status(201).send({ data: event });
  });

  // GET /api/v1/events
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    const query = listQuerySchema.parse(request.query);

    const conditions = [];
    if (query.status) conditions.push(eq(events.status, query.status));
    if (query.type) conditions.push(eq(events.type, query.type));
    if (query.cityId) conditions.push(eq(events.cityId, query.cityId));

    // Non-admins only see their own events + public confirmed/live events
    const { roles, userId } = request.jwtPayload;
    const isAdmin = roles.includes("platform_admin") || roles.includes("city_admin");
    if (!isAdmin) {
      conditions.push(
        sql`(${events.organizerId} = ${userId} OR ${events.status} IN ('confirmed', 'live', 'completed'))`,
      );
    }

    const rows = await app.db.query.events.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: query.limit,
      orderBy: [desc(events.createdAt)],
    });

    return {
      data: rows,
      meta: {
        cursor: rows.length === query.limit ? rows.at(-1)?.id ?? null : null,
        hasMore: rows.length === query.limit,
      },
    };
  });

  // GET /api/v1/events/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.id),
      });

      if (!event) throw app.httpErrors.notFound("Event not found");

      // Access control: owner, admin, or public if confirmed+
      const { roles, userId } = request.jwtPayload;
      const isOwner = event.organizerId === userId;
      const isAdmin = roles.includes("platform_admin") || roles.includes("city_admin");
      const isPublicStatus = ["confirmed", "live", "completed", "settled"].includes(event.status);

      if (!isOwner && !isAdmin && !isPublicStatus) {
        throw app.httpErrors.forbidden("Access denied");
      }

      return { data: event };
    },
  );

  // PATCH /api/v1/events/:id
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await getEventOrThrow(app, request.params.id);
      assertEventEditor(app, event, request.jwtPayload);

      if (["completed", "settled", "cancelled"].includes(event.status)) {
        throw app.httpErrors.conflict(
          `Cannot edit event in ${event.status} status`,
        );
      }

      const body = updateEventSchema.parse(request.body);
      const mergedEdl = body.edl ? { ...(event.edl as object), ...body.edl } : undefined;

      const [updated] = await app.db
        .update(events)
        .set({
          ...body,
          edl: mergedEdl ?? event.edl,
          startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : event.startDate,
          endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : event.endDate,
          updatedAt: new Date(),
        })
        .where(eq(events.id, request.params.id))
        .returning();

      await app.db.insert(eventHistory).values({
        eventId: event.id,
        actorId: request.jwtPayload.userId,
        action: "field_update",
        diff: body as unknown as Record<string, unknown>,
      });

      return { data: updated };
    },
  );

  // POST /api/v1/events/:id/transition — state machine
  app.post<{ Params: { id: string } }>(
    "/:id/transition",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await getEventOrThrow(app, request.params.id);
      assertEventEditor(app, event, request.jwtPayload);

      const body = transitionSchema.parse(request.body);
      const allowed = VALID_TRANSITIONS[event.status] ?? [];

      if (!allowed.includes(body.status)) {
        throw app.httpErrors.conflict(
          `Cannot transition from ${event.status} to ${body.status}. Allowed: ${allowed.join(", ") || "none"}`,
        );
      }

      const [updated] = await app.db
        .update(events)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(events.id, event.id))
        .returning();

      await app.db.insert(eventHistory).values({
        eventId: event.id,
        actorId: request.jwtPayload.userId,
        action: "state_change",
        fromStatus: event.status,
        toStatus: body.status,
        note: body.note,
      });

      return { data: updated };
    },
  );

  // DELETE /api/v1/events/:id — soft delete (cancel)
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const event = await getEventOrThrow(app, request.params.id);
      assertEventEditor(app, event, request.jwtPayload);

      if (event.status === "settled") {
        throw app.httpErrors.conflict("Cannot cancel a settled event");
      }

      await app.db
        .update(events)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(events.id, event.id));

      await app.db.insert(eventHistory).values({
        eventId: event.id,
        actorId: request.jwtPayload.userId,
        action: "state_change",
        fromStatus: event.status,
        toStatus: "cancelled",
        note: "Event deleted by organizer",
      });

      reply.status(204).send();
    },
  );

  // GET /api/v1/events/:id/history
  app.get<{ Params: { id: string } }>(
    "/:id/history",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await getEventOrThrow(app, request.params.id);
      assertEventViewer(app, event, request.jwtPayload);

      const history = await app.db.query.eventHistory.findMany({
        where: eq(eventHistory.eventId, event.id),
        orderBy: [desc(eventHistory.createdAt)],
      });

      return { data: history };
    },
  );

  // POST /api/v1/events/:id/forecast — AI demand forecast
  app.post<{ Params: { id: string } }>(
    "/:id/forecast",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }
      const event = await getEventOrThrow(app, request.params.id);
      assertEventViewer(app, event, request.jwtPayload);

      const forecaster = new DemandForecaster(app.db);
      const result = await forecaster.forecast(request.params.id);
      return { data: result };
    },
  );

  // POST /api/v1/events/:id/risk-assess — AI risk assessment
  app.post<{ Params: { id: string } }>(
    "/:id/risk-assess",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }
      const event = await getEventOrThrow(app, request.params.id);
      assertEventViewer(app, event, request.jwtPayload);

      const assessor = new RiskAssessor(app.db);
      const result = await assessor.assess(request.params.id);
      return { data: result };
    },
  );

  // POST /api/v1/events/:id/contingency-plan — Claude generates contingency plan
  app.post<{ Params: { id: string } }>(
    "/:id/contingency-plan",
    { onRequest: [authenticate] },
    async (request) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw app.httpErrors.serviceUnavailable("AI service not configured");
      }
      const event = await getEventOrThrow(app, request.params.id);
      assertEventViewer(app, event, request.jwtPayload);

      // First get a risk assessment
      const assessor = new RiskAssessor(app.db);
      const riskReport = await assessor.assess(request.params.id);

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Based on this risk assessment for event "${event.title}", create a comprehensive contingency plan.

Risk Assessment:
${JSON.stringify(riskReport, null, 2)}

Generate a contingency plan with:
1. Primary contingency actions for each high/critical risk
2. Communication plan (who to notify and when)
3. Escalation procedures
4. Recovery timeline
5. Budget reserves needed

Format as structured JSON with sections: primaryActions, communicationPlan, escalationProcedures, recoveryTimeline, budgetReserveCents`,
          },
        ],
      });

      const textContent = response.content.find((c: { type: string }) => c.type === "text") as { type: "text"; text: string } | undefined;
      let plan: unknown;
      try {
        const jsonMatch = textContent?.text.match(/\{[\s\S]*\}/);
        plan = JSON.parse(jsonMatch?.[0] ?? textContent?.text ?? "{}");
      } catch {
        plan = { summary: textContent?.text ?? "Contingency plan generation failed" };
      }

      return {
        data: {
          eventId: request.params.id,
          riskReport,
          contingencyPlan: plan,
          generatedAt: new Date().toISOString(),
        },
      };
    },
  );
};

// Helpers
async function getEventOrThrow(
  app: Parameters<FastifyPluginAsync>[0],
  id: string,
) {
  const event = await app.db.query.events.findFirst({
    where: eq(events.id, id),
  });
  if (!event) throw app.httpErrors.notFound("Event not found");
  return event;
}

type JwtPayload = { userId: string; roles: string[]; cityId: string | null };

function assertEventEditor(
  app: Parameters<FastifyPluginAsync>[0],
  event: { organizerId: string; cityId: string },
  jwt: JwtPayload,
) {
  const isOwner = event.organizerId === jwt.userId;
  const isPlatformAdmin = jwt.roles.includes("platform_admin");
  const isCityAdmin =
    jwt.roles.includes("city_admin") && jwt.cityId === event.cityId;

  if (!isOwner && !isPlatformAdmin && !isCityAdmin) {
    throw app.httpErrors.forbidden(
      "Only the event organizer or admin can perform this action",
    );
  }
}

function assertEventViewer(
  app: Parameters<FastifyPluginAsync>[0],
  event: { organizerId: string; cityId: string; status: string },
  jwt: JwtPayload,
) {
  const isOwner = event.organizerId === jwt.userId;
  const isAdmin =
    jwt.roles.includes("platform_admin") ||
    (jwt.roles.includes("city_admin") && jwt.cityId === event.cityId);
  const isPublic = ["confirmed", "live", "completed", "settled"].includes(event.status);

  if (!isOwner && !isAdmin && !isPublic) {
    throw app.httpErrors.forbidden("Access denied");
  }
}
