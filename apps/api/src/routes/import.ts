import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cities, events, eventHistory } from "@uniapp/db";
import { parseEventFromNaturalLanguage, EventRefusalError } from "@uniapp/ai";
import { authenticate } from "../middleware/auth.js";

const importRowSchema = z.object({
  description: z.string().min(1).max(5000),
  cityId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
});

const importBodySchema = z.object({
  events: z.array(importRowSchema).min(1).max(500),
});

interface ImportResult {
  index: number;
  title: string | null;
  eventId: string | null;
  error: string | null;
}

export const importRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/events/import
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const { userId, roles } = request.jwtPayload;

    if (!roles.includes("organizer") && !roles.includes("platform_admin") && !roles.includes("city_admin")) {
      throw app.httpErrors.forbidden("Only organizers can import events");
    }

    const body = importBodySchema.parse(request.body);

    // Pre-load cities to avoid N queries
    const cityIds = [...new Set(body.events.map((e) => e.cityId))];
    const cityRecords = await Promise.all(
      cityIds.map((id) =>
        app.db.query.cities.findFirst({
          where: eq(cities.id, id),
          columns: { id: true, name: true, state: true, timezone: true, permitConfig: true, regulatoryConfig: true },
        }),
      ),
    );
    const cityMap = new Map(cityRecords.filter(Boolean).map((c) => [c!.id, c!]));

    // Process all rows concurrently (up to 10 at a time)
    const results: ImportResult[] = [];
    const batchSize = 10;

    for (let i = 0; i < body.events.length; i += batchSize) {
      const batch = body.events.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (row, batchIdx) => {
          const idx = i + batchIdx;
          const city = cityMap.get(row.cityId);
          if (!city) {
            return { index: idx, title: null, eventId: null, error: `City ${row.cityId} not found` } satisfies ImportResult;
          }

          try {
            const { edl } = await parseEventFromNaturalLanguage({
              input: row.description,
              city: {
                name: city.name,
                state: city.state,
                timezone: city.timezone,
                permitConfig: city.permitConfig as Record<string, unknown>,
                regulatoryConfig: city.regulatoryConfig as Record<string, unknown>,
              },
            });

            const title = row.title ?? edl.title;

            const [event] = await app.db
              .insert(events)
              .values({
                organizerId: userId,
                cityId: row.cityId,
                title,
                type: edl.type,
                status: "draft",
                edl,
                attendanceMin: edl.attendance.min,
                attendanceMax: edl.attendance.max,
                budgetCents: edl.budget?.totalCents,
                metadata: { importedFrom: "bulk_import" },
              })
              .returning({ id: events.id });

            await app.db.insert(eventHistory).values({
              eventId: event!.id,
              actorId: userId,
              action: "state_change",
              fromStatus: null,
              toStatus: "draft",
              note: "Created via bulk import",
            });

            return { index: idx, title, eventId: event!.id, error: null } satisfies ImportResult;
          } catch (err) {
            const message =
              err instanceof EventRefusalError
                ? "Refused: " + err.message
                : err instanceof Error
                  ? err.message
                  : "Unknown error";
            return { index: idx, title: row.title ?? null, eventId: null, error: message } satisfies ImportResult;
          }
        }),
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({ index: i, title: null, eventId: null, error: String(result.reason) });
        }
      }
    }

    const imported = results.filter((r) => r.eventId !== null);
    const errors = results.filter((r) => r.error !== null);

    reply.status(207).send({
      data: {
        total: body.events.length,
        imported: imported.length,
        failed: errors.length,
        results,
      },
    });
  });
};
