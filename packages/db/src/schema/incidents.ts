import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { users } from "./users.js";

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  reporterId: uuid("reporter_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  // medical | security | fire | crowd_control | equipment | weather | other
  severity: text("severity").notNull().default("low"),
  // low | medium | high | critical
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  // open | investigating | resolved | closed
  response: text("response"),
  metadata: jsonb("metadata").default({}),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
