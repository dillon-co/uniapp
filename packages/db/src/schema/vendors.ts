import { pgTable, uuid, text, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const vendors = pgTable("vendors", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  categories: text("categories").array().notNull().default([]),
  serviceArea: text("service_area").array().notNull().default([]),
  pricingRange: jsonb("pricing_range").notNull().default({}), // { minCents, maxCents, unit }
  portfolio: jsonb("portfolio").notNull().default({}),         // { images, pastEvents, certifications }
  metadata: jsonb("metadata").notNull().default({}),
  trustScore: doublePrecision("trust_score").default(50.0),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
