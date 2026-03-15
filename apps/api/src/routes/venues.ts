import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { venues, bookings } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const createVenueSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  capacity: z.number().int().min(1),
  venueType: z.array(z.string()).min(1),
  amenities: z.array(z.string()).default([]),
  pricing: z.object({
    baseRateCents: z.number().int().min(0),
    currency: z.string().length(3).default("USD"),
    unit: z.enum(["hour", "day", "event"]).default("day"),
    tiers: z
      .array(
        z.object({
          label: z.string(),
          minHours: z.number().int().min(1).optional(),
          maxHours: z.number().int().min(1).optional(),
          rateCents: z.number().int().min(0),
        }),
      )
      .default([]),
  }),
  rules: z
    .object({
      maxNoise: z.string().optional(),
      alcoholAllowed: z.boolean().default(true),
      cateringExclusive: z.boolean().default(false),
      minBookingHours: z.number().int().min(1).default(2),
      maxCapacityStanding: z.number().int().optional(),
      notes: z.string().max(2000).optional(),
    })
    .default({}),
  images: z.array(z.string().url()).default([]),
});

const updateVenueSchema = createVenueSchema
  .partial()
  .omit({ orgId: true, latitude: true, longitude: true });

const searchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
  capacity: z.coerce.number().int().min(1).optional(),
  venueType: z.string().optional(),
  date: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const checkAvailabilitySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// Haversine distance in km (SQL expression)
function haversineDistKm(
  lat: number,
  lng: number,
  latCol: string,
  lngCol: string,
) {
  return sql<number>`
    6371 * 2 * ASIN(
      SQRT(
        POWER(SIN((RADIANS(${latCol}) - RADIANS(${lat})) / 2), 2) +
        COS(RADIANS(${lat})) * COS(RADIANS(${latCol})) *
        POWER(SIN((RADIANS(${lngCol}) - RADIANS(${lng})) / 2), 2)
      )
    )
  `;
}

export const venueRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/venues
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createVenueSchema.parse(request.body);

    const [venue] = await app.db
      .insert(venues)
      .values({
        orgId: body.orgId,
        name: body.name,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        capacity: body.capacity,
        venueType: body.venueType,
        amenities: body.amenities,
        pricing: body.pricing,
        availability: {},
        rules: body.rules,
        images: body.images,
      })
      .returning();

    reply.status(201).send({ data: venue });
  });

  // GET /api/v1/venues/search — geo-aware search
  app.get("/search", { onRequest: [authenticate] }, async (request) => {
    const query = searchSchema.parse(request.query);

    const conditions = [];

    if (query.capacity) {
      conditions.push(gte(venues.capacity, query.capacity));
    }

    if (query.venueType) {
      conditions.push(sql`${venues.venueType} @> ARRAY[${query.venueType}]::text[]`);
    }

    let rows = await app.db.query.venues.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: query.limit * 3, // over-fetch for geo filtering
    });

    // Filter by distance if coordinates provided
    if (query.lat !== undefined && query.lng !== undefined) {
      const lat = query.lat;
      const lng = query.lng;
      const radiusKm = query.radiusKm;

      rows = rows.filter((v) => {
        const dLat = ((v.latitude - lat) * Math.PI) / 180;
        const dLng = ((v.longitude - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((v.latitude * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= radiusKm;
      });

      // Sort by distance
      rows = rows.sort((a, b) => {
        const distA = haversineDistanceKm(lat, lng, a.latitude, a.longitude);
        const distB = haversineDistanceKm(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    // Filter by availability if date provided
    if (query.date) {
      const startOfDay = new Date(query.date);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);

      const bookedVenueIds = await app.db
        .select({ entityId: bookings.entityId })
        .from(bookings)
        .where(
          and(
            eq(bookings.entityType, "venue"),
            lte(bookings.startDate, endOfDay),
            gte(bookings.endDate, startOfDay),
            sql`${bookings.status} NOT IN ('cancelled', 'declined')`,
          ),
        );

      const bookedIds = new Set(bookedVenueIds.map((b) => b.entityId));
      rows = rows.filter((v) => !bookedIds.has(v.id));
    }

    return { data: rows.slice(0, query.limit) };
  });

  // GET /api/v1/venues/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const venue = await app.db.query.venues.findFirst({
        where: eq(venues.id, request.params.id),
      });

      if (!venue) throw app.httpErrors.notFound("Venue not found");
      return { data: venue };
    },
  );

  // PATCH /api/v1/venues/:id
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const venue = await app.db.query.venues.findFirst({
        where: eq(venues.id, request.params.id),
        columns: { id: true, orgId: true },
      });
      if (!venue) throw app.httpErrors.notFound("Venue not found");

      // Only venue managers or platform admins can edit
      const { roles } = request.jwtPayload;
      if (
        !roles.includes("platform_admin") &&
        !roles.includes("venue_manager") &&
        !roles.includes("city_admin")
      ) {
        throw app.httpErrors.forbidden("Insufficient permissions");
      }

      const body = updateVenueSchema.parse(request.body);
      const [updated] = await app.db
        .update(venues)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(venues.id, venue.id))
        .returning();

      return { data: updated };
    },
  );

  // GET /api/v1/venues/:id/availability
  app.get<{ Params: { id: string }; Querystring: { start: string; end: string } }>(
    "/:id/availability",
    { onRequest: [authenticate] },
    async (request) => {
      const venue = await app.db.query.venues.findFirst({
        where: eq(venues.id, request.params.id),
        columns: { id: true, availability: true },
      });
      if (!venue) throw app.httpErrors.notFound("Venue not found");

      const { startDate: start, endDate: end } = checkAvailabilitySchema.parse({
        startDate: request.query.start,
        endDate: request.query.end,
      });

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Find conflicting bookings
      const conflicts = await app.db
        .select({
          id: bookings.id,
          status: bookings.status,
          startDate: bookings.startDate,
          endDate: bookings.endDate,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.entityType, "venue"),
            eq(bookings.entityId, venue.id),
            lte(bookings.startDate, endDate),
            gte(bookings.endDate, startDate),
            sql`${bookings.status} NOT IN ('cancelled', 'declined')`,
          ),
        );

      const isAvailable = conflicts.length === 0;

      return {
        data: {
          venueId: venue.id,
          startDate: start,
          endDate: end,
          isAvailable,
          conflicts: conflicts.map((c) => ({
            bookingId: c.id,
            status: c.status,
            startDate: c.startDate,
            endDate: c.endDate,
          })),
          blockedDates: (venue.availability as Record<string, unknown>)?.blockedDates ?? [],
        },
      };
    },
  );

  // GET /api/v1/venues/:id/pricing
  app.get<{ Params: { id: string }; Querystring: { hours?: string } }>(
    "/:id/pricing",
    { onRequest: [authenticate] },
    async (request) => {
      const venue = await app.db.query.venues.findFirst({
        where: eq(venues.id, request.params.id),
        columns: { id: true, name: true, pricing: true },
      });
      if (!venue) throw app.httpErrors.notFound("Venue not found");

      const pricing = venue.pricing as {
        baseRateCents: number;
        currency: string;
        unit: string;
        tiers: Array<{
          label: string;
          minHours?: number;
          maxHours?: number;
          rateCents: number;
        }>;
      };

      const hours = request.query.hours ? parseInt(request.query.hours, 10) : undefined;
      let applicableRate = pricing.baseRateCents;
      let tierLabel = "base";

      if (hours && pricing.tiers.length > 0) {
        const matchingTier = pricing.tiers.find(
          (t) =>
            (t.minHours === undefined || hours >= t.minHours) &&
            (t.maxHours === undefined || hours <= t.maxHours),
        );
        if (matchingTier) {
          applicableRate = matchingTier.rateCents;
          tierLabel = matchingTier.label;
        }
      }

      return {
        data: {
          venueId: venue.id,
          venueName: venue.name,
          currency: pricing.currency,
          unit: pricing.unit,
          baseRateCents: pricing.baseRateCents,
          tiers: pricing.tiers,
          ...(hours !== undefined && {
            requestedHours: hours,
            totalCents: applicableRate * (pricing.unit === "hour" ? hours : 1),
            appliedTier: tierLabel,
          }),
        },
      };
    },
  );

  // DELETE /api/v1/venues/:id
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { roles } = request.jwtPayload;
      if (!roles.includes("platform_admin") && !roles.includes("venue_manager")) {
        throw app.httpErrors.forbidden("Insufficient permissions");
      }

      const venue = await app.db.query.venues.findFirst({
        where: eq(venues.id, request.params.id),
        columns: { id: true },
      });
      if (!venue) throw app.httpErrors.notFound("Venue not found");

      await app.db.delete(venues).where(eq(venues.id, venue.id));
      reply.status(204).send();
    },
  );
};

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
