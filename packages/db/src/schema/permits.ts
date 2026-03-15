import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { cities } from "./cities.js";

export const permits = pgTable("permits", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  cityId: uuid("city_id").notNull().references(() => cities.id),
  type: text("type").notNull(), // noise | assembly | food | alcohol | street_closure | fire_safety
  status: text("status").notNull().default("draft"),
  // draft | submitted | under_review | approved | rejected | expired
  applicationData: jsonb("application_data").notNull().default({}),
  trackingNumber: text("tracking_number").unique(),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
