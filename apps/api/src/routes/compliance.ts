import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { events, permits, bookings, venues } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

export const complianceRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/compliance/events?cityId= — events with permit status and compliance metrics
  app.get("/events", { onRequest: [authenticate] }, async (request) => {
    const { cityId } = z
      .object({ cityId: z.string().uuid().optional() })
      .parse(request.query);

    const { roles, cityId: userCityId } = request.jwtPayload;
    const isAdmin = roles.includes("platform_admin");
    const isCityAdmin = roles.includes("city_admin");

    if (!isAdmin && !isCityAdmin) {
      throw app.httpErrors.forbidden("City admin or platform admin required");
    }

    // Determine which city to filter by
    const targetCityId = isAdmin ? cityId : (cityId ?? userCityId ?? undefined);

    const allEvents = targetCityId
      ? await app.db.query.events.findMany({
          where: eq(events.cityId, targetCityId),
          orderBy: [desc(events.createdAt)],
          limit: 100,
        })
      : await app.db.query.events.findMany({
          orderBy: [desc(events.createdAt)],
          limit: 100,
        });

    // For each event, get permit status and compliance info
    const result = await Promise.all(
      allEvents.map(async (event) => {
        // Get most recent permit
        const permitRows = await app.db.query.permits.findMany({
          where: eq(permits.eventId, event.id),
          columns: { status: true, type: true },
        });

        const mostCriticalPermitStatus = permitRows.length === 0
          ? "none"
          : permitRows.some((p) => p.status === "rejected") ? "rejected"
          : permitRows.some((p) => p.status === "submitted" || p.status === "under_review") ? "under_review"
          : permitRows.some((p) => p.status === "draft") ? "draft"
          : permitRows.every((p) => p.status === "approved") ? "approved"
          : "mixed";

        // Check capacity compliance (simple: if attendanceMax is set, it's compliant by default)
        const capacityCompliant = event.attendanceMax !== null ? event.attendanceMax <= 100000 : true;

        // Noise ordinance compliance — if they have a noise permit or attendance < 100
        const hasNoisePermit = permitRows.some((p) => p.type === "noise" && p.status === "approved");
        const noiseCompliant = (event.attendanceMax ?? 0) < 100 || hasNoisePermit;

        return {
          id: event.id,
          title: event.title,
          type: event.type,
          status: event.status,
          cityId: event.cityId,
          startDate: event.startDate?.toISOString() ?? null,
          attendanceMax: event.attendanceMax,
          permitStatus: mostCriticalPermitStatus,
          permitCount: permitRows.length,
          capacityCompliant,
          noiseOrdinanceCompliant: noiseCompliant,
          complianceScore: Math.round(
            (capacityCompliant ? 50 : 0) +
              (noiseCompliant ? 25 : 0) +
              (mostCriticalPermitStatus === "approved" ? 25 : mostCriticalPermitStatus === "none" ? 0 : 10),
          ),
        };
      }),
    );

    return { data: result };
  });

  // GET /api/v1/compliance/summary — aggregate compliance stats
  app.get("/summary", { onRequest: [authenticate] }, async (request) => {
    const { roles } = request.jwtPayload;
    if (!roles.includes("platform_admin") && !roles.includes("city_admin")) {
      throw app.httpErrors.forbidden("Admin required");
    }

    const totalEvents = await app.db.query.events.findMany({
      columns: { id: true, status: true },
    });
    const totalPermits = await app.db.query.permits.findMany({
      columns: { id: true, status: true },
    });

    return {
      data: {
        totalEvents: totalEvents.length,
        activeEvents: totalEvents.filter((e) => ["planning", "negotiating", "confirmed", "live"].includes(e.status)).length,
        totalPermits: totalPermits.length,
        pendingPermits: totalPermits.filter((p) => ["draft", "submitted", "under_review"].includes(p.status)).length,
        approvedPermits: totalPermits.filter((p) => p.status === "approved").length,
        rejectedPermits: totalPermits.filter((p) => p.status === "rejected").length,
      },
    };
  });
};
