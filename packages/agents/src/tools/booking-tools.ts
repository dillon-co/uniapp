import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { bookings } from "@uniapp/db";
import type { ToolDefinition } from "./venue-tools.js";

export function createBookingTools(db: Database, eventId: string): ToolDefinition<z.ZodObject<z.ZodRawShape>>[] {
  return [
    {
      name: "list_event_bookings",
      description: "List all current bookings for the event, including their status.",
      inputSchema: z.object({
        status: z.enum(["pending", "approved", "confirmed", "completed", "rejected", "cancelled"]).optional()
          .describe("Filter by booking status"),
      }),
      run: async (input) => {
        const conditions = [eq(bookings.eventId, eventId)];
        if (input.status) conditions.push(eq(bookings.status, input.status));

        const rows = await db.query.bookings.findMany({
          where: and(...conditions),
          columns: { id: true, entityType: true, entityId: true, status: true, priceCents: true, startDate: true, endDate: true },
        });

        if (rows.length === 0) return "No bookings found for this event.";
        return rows.map((b) =>
          `ID: ${b.id} | Type: ${b.entityType} | Entity: ${b.entityId} | Status: ${b.status} | Price: $${((b.priceCents) / 100).toLocaleString()} | ${b.startDate?.toLocaleDateString()} – ${b.endDate?.toLocaleDateString()}`
        ).join("\n");
      },
    },

    {
      name: "get_booking_summary",
      description: "Get a high-level summary of booking progress for the event.",
      inputSchema: z.object({}),
      run: async (_input) => {
        const rows = await db.query.bookings.findMany({
          where: eq(bookings.eventId, eventId),
          columns: { status: true, entityType: true, priceCents: true },
        });

        const summary = {
          total: rows.length,
          byStatus: {} as Record<string, number>,
          byType: {} as Record<string, number>,
          totalCommittedCents: 0,
        };

        for (const b of rows) {
          summary.byStatus[b.status] = (summary.byStatus[b.status] ?? 0) + 1;
          summary.byType[b.entityType] = (summary.byType[b.entityType] ?? 0) + 1;
          if (["approved", "confirmed"].includes(b.status)) {
            summary.totalCommittedCents += b.priceCents;
          }
        }

        return JSON.stringify({
          ...summary,
          totalCommitted: `$${(summary.totalCommittedCents / 100).toLocaleString()}`,
        }, null, 2);
      },
    },
  ];
}
