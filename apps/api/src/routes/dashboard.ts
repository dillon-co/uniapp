import type { FastifyPluginAsync } from "fastify";
import { eq, and, count, sql } from "drizzle-orm";
import { events, bookings, eventHistory } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

// Simple in-memory cache (30s TTL) — replace with Redis in production
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(key: string, data: unknown, ttlMs = 30_000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:id/dashboard
  app.get<{ Params: { id: string } }>(
    "/:id/dashboard",
    { onRequest: [authenticate] },
    async (request) => {
      const eventId = request.params.id;
      const cacheKey = `dashboard:${eventId}`;

      const cached = getCached<unknown>(cacheKey);
      if (cached) return { data: cached, meta: { cached: true } };

      const event = await app.db.query.events.findFirst({
        where: eq(events.id, eventId),
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      // Access control
      const { userId, roles } = request.jwtPayload;
      const isOwner = event.organizerId === userId;
      const isAdmin = roles.includes("platform_admin") ||
        (roles.includes("city_admin") && request.jwtPayload.cityId === event.cityId);
      if (!isOwner && !isAdmin) throw app.httpErrors.forbidden("Access denied");

      // Aggregate bookings
      const allBookings = await app.db.query.bookings.findMany({
        where: eq(bookings.eventId, eventId),
        columns: { id: true, status: true, entityType: true, priceCents: true, depositCents: true },
      });

      const bookingStats = {
        total: allBookings.length,
        pending: allBookings.filter((b) => b.status === "pending").length,
        approved: allBookings.filter((b) => b.status === "approved").length,
        confirmed: allBookings.filter((b) => b.status === "confirmed").length,
        rejected: allBookings.filter((b) => b.status === "rejected").length,
        cancelled: allBookings.filter((b) => b.status === "cancelled").length,
        venues: allBookings.filter((b) => b.entityType === "venue").length,
        vendors: allBookings.filter((b) => b.entityType === "vendor").length,
      };

      const committedSpendCents = allBookings
        .filter((b) => ["confirmed", "approved"].includes(b.status))
        .reduce((sum, b) => sum + b.priceCents, 0);

      const budget = event.budgetCents ?? 0;
      const budgetStats = {
        totalCents: budget,
        committedCents: committedSpendCents,
        remainingCents: Math.max(0, budget - committedSpendCents),
        utilizationPct: budget > 0 ? Math.round((committedSpendCents / budget) * 100) : 0,
      };

      // Recent activity (last 10)
      const recentActivity = await app.db.query.eventHistory.findMany({
        where: eq(eventHistory.eventId, eventId),
        orderBy: [sql`${eventHistory.createdAt} DESC`],
        limit: 10,
      });

      // Warnings
      const warnings: string[] = [];

      if (bookingStats.venues === 0 && event.status !== "draft") {
        warnings.push("No venue booked yet");
      }
      if (budget > 0 && budgetStats.utilizationPct > 90) {
        warnings.push(`Budget nearly exhausted (${budgetStats.utilizationPct}% committed)`);
      }
      if (bookingStats.pending > 0) {
        warnings.push(`${bookingStats.pending} booking(s) awaiting response`);
      }
      if (!event.startDate && event.status !== "draft") {
        warnings.push("Event start date not set");
      }

      // Next actions
      const nextActions: string[] = [];
      if (event.status === "draft") {
        nextActions.push("Add event details and transition to Planning");
      }
      if (event.status === "planning") {
        if (bookingStats.venues === 0) nextActions.push("Search and book a venue");
        nextActions.push("Transition to Negotiating when venue discussions begin");
      }
      if (event.status === "negotiating" && bookingStats.confirmed > 0) {
        nextActions.push("All key bookings confirmed — transition to Confirmed");
      }

      const dashboard = {
        eventId,
        title: event.title,
        status: event.status,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        attendanceMax: event.attendanceMax,
        bookings: bookingStats,
        budget: budgetStats,
        recentActivity,
        warnings,
        nextActions,
        generatedAt: new Date().toISOString(),
      };

      setCached(cacheKey, dashboard);
      return { data: dashboard, meta: { cached: false } };
    },
  );
};
