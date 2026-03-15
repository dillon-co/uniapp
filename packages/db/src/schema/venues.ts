import { pgTable, uuid, text, timestamp, jsonb, integer, doublePrecision } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  capacity: integer("capacity").notNull(),
  venueType: text("venue_type").array().notNull(),
  amenities: text("amenities").array().notNull().default([]),
  pricing: jsonb("pricing").notNull(),
  availability: jsonb("availability").notNull().default({}),
  rules: jsonb("rules").notNull().default({}),
  images: text("images").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
