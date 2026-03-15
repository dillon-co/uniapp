import { pgTable, uuid, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { events } from "./events.js";

export const settlements = pgTable("settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id).unique(),
  status: text("status").notNull().default("pending"),
  // pending | processing | completed | disputed
  totalRevenueCents: bigint("total_revenue_cents", { mode: "number" }).notNull().default(0),
  totalSpendCents: bigint("total_spend_cents", { mode: "number" }).notNull().default(0),
  netCents: bigint("net_cents", { mode: "number" }).notNull().default(0),
  breakdown: jsonb("breakdown").notNull().default({}),
  outstandingPayments: jsonb("outstanding_payments").notNull().default([]),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
