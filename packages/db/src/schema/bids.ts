import { pgTable, uuid, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { vendors } from "./vendors.js";

export const bids = pgTable("bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
  eventId: uuid("event_id").notNull().references(() => events.id),
  status: text("status").notNull().default("pending"),
  // pending | accepted | rejected | countered | expired | withdrawn
  proposal: jsonb("proposal").notNull(), // { priceCents, quantity, deliveryTerms, conditions, notes }
  counterProposal: jsonb("counter_proposal"),
  response: jsonb("response"),           // { action, note, respondedAt }
  negotiationId: uuid("negotiation_id"),  // link to negotiations table if escalated
  autoAcceptThresholdCents: bigint("auto_accept_threshold_cents", { mode: "number" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
