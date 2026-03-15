import { pgTable, uuid, text, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";

export const analytics = pgTable("analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(), // event | city | venue | vendor | platform
  entityId: uuid("entity_id").notNull(),
  metric: text("metric").notNull(),
  // e.g. attendance, revenue_cents, booking_count, volunteer_hours, conversion_rate
  value: doublePrecision("value").notNull(),
  dimensions: jsonb("dimensions").notNull().default({}),
  // Additional context: { period: "2024-Q1", category: "venue", ... }
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
