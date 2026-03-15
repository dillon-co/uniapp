import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, lte, sql } from "drizzle-orm";
import { volunteers, volunteerShifts, shiftSignups } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const registerSchema = z.object({
  skills: z.array(z.string()).default([]),
  availability: z.object({
    weeklyBlocks: z.array(z.object({
      day: z.number().int().min(0).max(6),
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(0).max(23),
    })).default([]),
    blockedDates: z.array(z.string().date()).default([]),
  }).default({}),
  preferences: z.object({
    maxDistanceKm: z.number().min(0).default(25),
    eventTypes: z.array(z.string()).default([]),
    notificationFrequency: z.enum(["immediate", "daily", "weekly"]).default("daily"),
  }).default({}),
});

const createShiftSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1).max(255),
  role: z.string().min(1).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  slots: z.number().int().min(1).default(1),
  requirements: z.array(z.string()).default([]),
});

export const volunteerRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/volunteers — register volunteer profile
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const { userId } = request.jwtPayload;
    const body = registerSchema.parse(request.body);

    const existing = await app.db.query.volunteers.findFirst({
      where: eq(volunteers.userId, userId), columns: { id: true },
    });
    if (existing) throw app.httpErrors.conflict("Volunteer profile already exists");

    const [volunteer] = await app.db
      .insert(volunteers)
      .values({ userId, ...body })
      .returning();

    reply.status(201).send({ data: volunteer });
  });

  // GET /api/v1/volunteers/me
  app.get("/me", { onRequest: [authenticate] }, async (request) => {
    const vol = await app.db.query.volunteers.findFirst({
      where: eq(volunteers.userId, request.jwtPayload.userId),
    });
    if (!vol) throw app.httpErrors.notFound("Volunteer profile not found");
    return { data: vol };
  });

  // PATCH /api/v1/volunteers/me
  app.patch("/me", { onRequest: [authenticate] }, async (request) => {
    const body = registerSchema.partial().parse(request.body);
    const [updated] = await app.db
      .update(volunteers)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(volunteers.userId, request.jwtPayload.userId))
      .returning();
    if (!updated) throw app.httpErrors.notFound("Volunteer profile not found");
    return { data: updated };
  });

  // GET /api/v1/volunteers/shifts — browse available shifts
  app.get("/shifts", { onRequest: [authenticate] }, async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid().optional() }).parse(request.query);

    const rows = await app.db.query.volunteerShifts.findMany({
      where: eventId ? eq(volunteerShifts.eventId, eventId) : undefined,
      limit: 50,
    });

    return { data: rows };
  });

  // POST /api/v1/volunteers/shifts — create shift (organizer)
  app.post("/shifts", { onRequest: [authenticate] }, async (request, reply) => {
    const { roles } = request.jwtPayload;
    if (!roles.includes("organizer") && !roles.includes("platform_admin")) {
      throw app.httpErrors.forbidden("Only organizers can create shifts");
    }
    const body = createShiftSchema.parse(request.body);
    const [shift] = await app.db
      .insert(volunteerShifts)
      .values({ ...body, startTime: new Date(body.startTime), endTime: new Date(body.endTime) })
      .returning();
    reply.status(201).send({ data: shift });
  });

  // POST /api/v1/volunteers/shifts/:id/signup
  app.post<{ Params: { id: string } }>(
    "/shifts/:id/signup",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { userId } = request.jwtPayload;
      const shift = await app.db.query.volunteerShifts.findFirst({
        where: eq(volunteerShifts.id, request.params.id),
        columns: { id: true, slots: true, filled: true },
      });
      if (!shift) throw app.httpErrors.notFound("Shift not found");
      if (shift.filled >= shift.slots) throw app.httpErrors.conflict("Shift is full");

      const [signup] = await app.db
        .insert(shiftSignups)
        .values({ shiftId: shift.id, userId, status: "registered" })
        .returning();

      await app.db
        .update(volunteerShifts)
        .set({ filled: shift.filled + 1 })
        .where(eq(volunteerShifts.id, shift.id));

      reply.status(201).send({ data: signup });
    },
  );

  // POST /api/v1/volunteers/shifts/:id/checkin
  app.post<{ Params: { id: string } }>(
    "/shifts/:id/checkin",
    { onRequest: [authenticate] },
    async (request) => {
      const { userId } = request.jwtPayload;
      const [updated] = await app.db
        .update(shiftSignups)
        .set({ status: "checked_in", checkedInAt: new Date() })
        .where(and(eq(shiftSignups.shiftId, request.params.id), eq(shiftSignups.userId, userId)))
        .returning();
      if (!updated) throw app.httpErrors.notFound("Signup not found");
      return { data: updated };
    },
  );

  // POST /api/v1/volunteers/shifts/:id/checkout
  app.post<{ Params: { id: string } }>(
    "/shifts/:id/checkout",
    { onRequest: [authenticate] },
    async (request) => {
      const { userId } = request.jwtPayload;
      const [updated] = await app.db
        .update(shiftSignups)
        .set({ status: "completed", checkedOutAt: new Date() })
        .where(and(eq(shiftSignups.shiftId, request.params.id), eq(shiftSignups.userId, userId)))
        .returning();
      if (!updated) throw app.httpErrors.notFound("Signup not found");
      return { data: updated };
    },
  );
};
