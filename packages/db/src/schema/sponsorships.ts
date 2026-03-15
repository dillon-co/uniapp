import { pgTable, uuid, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { organizations } from "./organizations.js";

export const sponsorships = pgTable("sponsorships", {
  id: uuid("id").defaultRandom().primaryKey(),
  sponsorId: uuid("sponsor_id").notNull().references(() => organizations.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  type: text("type").notNull().default("financial"), // financial | in_kind | media
  benefits: jsonb("benefits").notNull().default([]),
  // Array of { benefit, description }
  paymentStatus: text("payment_status").notNull().default("pending"),
  // pending | invoiced | paid | refunded
  paidAt: timestamp("paid_at", { withTimezone: true }),
  contractUrl: text("contract_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
