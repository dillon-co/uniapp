import { pgTable, uuid, text, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { cities } from "./cities.js";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  cityId: uuid("city_id").references(() => cities.id),
  metadata: jsonb("metadata").notNull().default({}),
  trustScore: doublePrecision("trust_score").default(50.0),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
