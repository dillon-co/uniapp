import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, gte, lte, ilike, or, sql, desc, count } from "drizzle-orm";
import { events } from "@uniapp/db";

const EVENT_STATUSES = ["draft", "planning", "negotiating", "confirmed", "live", "completed", "settled", "cancelled"] as const;

const searchQuerySchema = z.object({
  q: z.string().max(200).optional(),
  cityId: z.string().uuid().optional(),
  type: z.string().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(200).default(25),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

const suggestQuerySchema = z.object({
  q: z.string().min(1).max(100),
});

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/search
  app.get("/", async (request) => {
    const query = searchQuerySchema.parse(request.query);
    const conditions = [];

    // Only show public events in search
    conditions.push(sql`${events.status} IN ('confirmed', 'live', 'completed')`);

    if (query.q) {
      const term = `%${query.q}%`;
      conditions.push(
        or(
          ilike(events.title, term),
          ilike(events.description ?? "", term),
          ilike(events.type, term),
        )!,
      );
    }

    if (query.cityId) conditions.push(eq(events.cityId, query.cityId));
    if (query.type) conditions.push(ilike(events.type, query.type));
    if (query.status) conditions.push(eq(events.status, query.status));

    if (query.dateFrom) {
      conditions.push(gte(events.startDate, new Date(query.dateFrom)));
    }
    if (query.dateTo) {
      conditions.push(lte(events.startDate, new Date(query.dateTo)));
    }

    let rows = await app.db.query.events.findMany({
      where: and(...conditions),
      orderBy: [desc(events.createdAt)],
      limit: query.limit * 3, // over-fetch for geo filtering
      columns: {
        id: true,
        title: true,
        type: true,
        status: true,
        cityId: true,
        startDate: true,
        endDate: true,
        latitude: true,
        longitude: true,
        attendanceMin: true,
        attendanceMax: true,
        createdAt: true,
      },
    });

    // Geo filter
    if (query.lat !== undefined && query.lng !== undefined) {
      const lat = query.lat;
      const lng = query.lng;
      rows = rows.filter((e) => {
        if (!e.latitude || !e.longitude) return false;
        const dLat = ((e.latitude - lat) * Math.PI) / 180;
        const dLng = ((e.longitude - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((e.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return distKm <= query.radiusKm;
      });
    }

    const sliced = rows.slice(0, query.limit);

    // Facet counts by type
    const typeFacets = rows.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      data: sliced,
      meta: {
        cursor: sliced.length === query.limit ? sliced.at(-1)?.id ?? null : null,
        hasMore: sliced.length === query.limit,
        total: rows.length,
        facets: { type: typeFacets },
      },
    };
  });

  // GET /api/v1/events/suggest?q=str — autocomplete
  app.get("/suggest", async (request) => {
    const { q } = suggestQuerySchema.parse(request.query);
    const term = `${q}%`;

    const rows = await app.db.query.events.findMany({
      where: and(
        ilike(events.title, term),
        sql`${events.status} IN ('confirmed', 'live')`,
      ),
      columns: { id: true, title: true, type: true },
      limit: 5,
      orderBy: [desc(events.createdAt)],
    });

    return { data: rows };
  });
};
