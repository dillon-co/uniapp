import { z } from "zod";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { venues, bookings } from "@uniapp/db";

export interface ToolDefinition<TInput extends z.ZodObject<z.ZodRawShape>> {
  name: string;
  description: string;
  inputSchema: TInput;
  run: (input: z.infer<TInput>) => Promise<string>;
}

export function createVenueTools(db: Database, _eventId: string): ToolDefinition<z.ZodObject<z.ZodRawShape>>[] {
  return [
    {
      name: "search_venues",
      description: "Search for venues by capacity, type, and location. Returns a list of matching venues with pricing.",
      inputSchema: z.object({
        minCapacity: z.number().int().min(1).optional().describe("Minimum capacity required"),
        venueType: z.string().optional().describe("Type of venue (outdoor, indoor, warehouse, etc.)"),
        cityId: z.string().uuid().optional().describe("City ID to filter by"),
        limit: z.number().int().min(1).max(20).default(10).describe("Max results to return"),
      }),
      run: async (input) => {
        const conditions = [];
        if (input.minCapacity) conditions.push(gte(venues.capacity, input.minCapacity));
        if (input.venueType) conditions.push(sql`${venues.venueType} @> ARRAY[${input.venueType}]::text[]`);

        const results = await db.query.venues.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          columns: { id: true, name: true, address: true, capacity: true, venueType: true, pricing: true, amenities: true },
          limit: input.limit,
        });

        if (results.length === 0) return "No venues found matching the criteria.";

        return results.map((v) => {
          const pricing = v.pricing as { baseRateCents: number; unit: string };
          return `ID: ${v.id}\nName: ${v.name}\nAddress: ${v.address}\nCapacity: ${v.capacity}\nTypes: ${v.venueType.join(", ")}\nPrice: $${(pricing.baseRateCents / 100).toLocaleString()}/${pricing.unit}\nAmenities: ${(v.amenities as string[]).slice(0, 5).join(", ")}`;
        }).join("\n\n---\n\n");
      },
    },

    {
      name: "get_venue_details",
      description: "Get full details of a specific venue including rules, pricing tiers, and current availability.",
      inputSchema: z.object({
        venueId: z.string().uuid().describe("The venue ID"),
      }),
      run: async (input) => {
        const venue = await db.query.venues.findFirst({
          where: eq(venues.id, input.venueId),
        });
        if (!venue) return `Venue ${input.venueId} not found.`;

        return JSON.stringify({
          id: venue.id,
          name: venue.name,
          address: venue.address,
          capacity: venue.capacity,
          venueType: venue.venueType,
          amenities: venue.amenities,
          pricing: venue.pricing,
          rules: venue.rules,
        }, null, 2);
      },
    },

    {
      name: "check_venue_availability",
      description: "Check if a venue is available for a given date range.",
      inputSchema: z.object({
        venueId: z.string().uuid().describe("The venue ID"),
        startDate: z.string().datetime().describe("Start date/time (ISO 8601)"),
        endDate: z.string().datetime().describe("End date/time (ISO 8601)"),
      }),
      run: async (input) => {
        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        const conflict = await db.query.bookings.findFirst({
          where: and(
            eq(bookings.entityType, "venue"),
            eq(bookings.entityId, input.venueId),
            lte(bookings.startDate, endDate),
            gte(bookings.endDate, startDate),
            sql`${bookings.status} NOT IN ('cancelled', 'rejected')`,
          ),
          columns: { id: true, status: true, startDate: true, endDate: true },
        });

        if (conflict) {
          return `Venue is NOT available. Conflicting booking: ${conflict.id} (${conflict.status}) from ${conflict.startDate?.toISOString()} to ${conflict.endDate?.toISOString()}`;
        }
        return `Venue is AVAILABLE for ${input.startDate} to ${input.endDate}.`;
      },
    },
  ];
}
