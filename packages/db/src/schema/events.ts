import { pgTable, uuid, text, timestamp, jsonb, integer, bigint, doublePrecision } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { cities } from "./cities.js";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizerId: uuid("organizer_id").notNull().references(() => users.id),
  cityId: uuid("city_id").notNull().references(() => cities.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  status: text("status").notNull().default("draft"),
  edl: jsonb("edl").notNull(),
  plan: jsonb("plan"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  attendanceMin: integer("attendance_min"),
  attendanceMax: integer("attendance_max"),
  budgetCents: bigint("budget_cents", { mode: "number" }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
