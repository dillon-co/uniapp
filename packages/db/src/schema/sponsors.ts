import { pgTable, uuid, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  categories: text("categories").array().notNull().default([]),
  // e.g. ["music", "sports", "technology", "food"]
  budgetCents: bigint("budget_cents", { mode: "number" }).notNull().default(0),
  targetEventTypes: text("target_event_types").array().notNull().default([]),
  // e.g. ["concert", "festival", "conference"]
  contactEmail: text("contact_email"),
  website: text("website"),
  logoUrl: text("logo_url"),
  description: text("description"),
  active: text("active").notNull().default("true"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
