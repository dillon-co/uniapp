import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, cities } from "@uniapp/db";
import type { ToolDefinition } from "./venue-tools.js";

export function createEventTools(db: Database): ToolDefinition<z.ZodObject<z.ZodRawShape>>[] {
  return [
    {
      name: "get_event_details",
      description: "Get full event details including EDL, city context, and current status.",
      inputSchema: z.object({
        eventId: z.string().uuid().describe("The event ID"),
      }),
      run: async (input) => {
        const event = await db.query.events.findFirst({
          where: eq(events.id, input.eventId),
          columns: {
            id: true, title: true, type: true, status: true, description: true,
            edl: true, startDate: true, endDate: true, attendanceMin: true,
            attendanceMax: true, budgetCents: true, cityId: true, latitude: true, longitude: true,
          },
        });

        if (!event) return `Event ${input.eventId} not found.`;

        const city = await db.query.cities.findFirst({
          where: eq(cities.id, event.cityId),
          columns: { name: true, state: true, timezone: true, permitConfig: true, regulatoryConfig: true },
        });

        return JSON.stringify({
          event: {
            ...event,
            budgetFormatted: event.budgetCents ? `$${(event.budgetCents / 100).toLocaleString()}` : null,
          },
          city,
        }, null, 2);
      },
    },

    {
      name: "get_permit_requirements",
      description: "Get permit requirements for an event based on the city regulatory config and event EDL.",
      inputSchema: z.object({
        eventId: z.string().uuid().describe("The event ID"),
      }),
      run: async (input) => {
        const event = await db.query.events.findFirst({
          where: eq(events.id, input.eventId),
          columns: { edl: true, cityId: true, attendanceMax: true, type: true },
        });
        if (!event) return "Event not found.";

        const city = await db.query.cities.findFirst({
          where: eq(cities.id, event.cityId),
          columns: { name: true, state: true, permitConfig: true, regulatoryConfig: true },
        });

        const edl = event.edl as {
          requirements?: { permitTypes?: string[] };
          schedule?: { start?: string };
          location?: { type?: string };
        };

        const permits = edl.requirements?.permitTypes ?? [];
        const config = city?.permitConfig as { requiresPermit?: boolean; leadTimeDays?: number } ?? {};
        const regulatory = city?.regulatoryConfig as { noiseOrdinance?: string; maxCapacityOutdoor?: number } ?? {};

        const analysis = {
          city: `${city?.name}, ${city?.state}`,
          requiredPermitTypes: permits,
          cityRequiresPermit: config.requiresPermit ?? false,
          leadTimeDays: config.leadTimeDays ?? 30,
          noiseOrdinance: regulatory.noiseOrdinance,
          maxOutdoorCapacity: regulatory.maxCapacityOutdoor,
          attendanceMax: event.attendanceMax,
          eventType: event.type,
          locationIndoor: edl.location?.type === "indoor",
          recommendations: [] as string[],
        };

        if (analysis.attendanceMax && analysis.maxOutdoorCapacity &&
          analysis.attendanceMax > analysis.maxOutdoorCapacity && !analysis.locationIndoor) {
          analysis.recommendations.push(`Attendance (${analysis.attendanceMax}) exceeds outdoor capacity limit (${analysis.maxOutdoorCapacity}). Indoor venue required or special permit needed.`);
        }
        if (analysis.cityRequiresPermit && permits.length === 0) {
          analysis.recommendations.push(`City requires permits but none specified in EDL. Add permit types based on event requirements.`);
        }

        return JSON.stringify(analysis, null, 2);
      },
    },
  ];
}
