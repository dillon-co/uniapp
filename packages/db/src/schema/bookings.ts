import { pgTable, uuid, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { events } from "./events.js";

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  status: text("status").notNull().default("pending"),
  terms: jsonb("terms").notNull(),
  priceCents: bigint("price_cents", { mode: "number" }).notNull(),
  depositCents: bigint("deposit_cents", { mode: "number" }).default(0),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  negotiationId: uuid("negotiation_id"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
