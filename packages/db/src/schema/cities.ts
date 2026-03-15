import { pgTable, uuid, text, jsonb, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const cities = pgTable("cities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("US"),
  timezone: text("timezone").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  permitConfig: jsonb("permit_config").notNull().default({}),
  regulatoryConfig: jsonb("regulatory_config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
