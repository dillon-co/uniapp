import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { events } from "./events.js";

export const negotiations = pgTable("negotiations", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  // The party initiating (organizer/agent acting on behalf of event)
  initiatorType: text("initiator_type").notNull(), // organizer | agent
  initiatorId: uuid("initiator_id").notNull(),
  // The party responding (venue/vendor)
  responderType: text("responder_type").notNull(), // venue | vendor
  responderId: uuid("responder_id").notNull(),
  status: text("status").notNull().default("active"),
  // active | resolved | rejected | escalated | expired
  subject: text("subject").notNull(), // e.g. "venue_booking", "vendor_contract"
  rounds: jsonb("rounds").notNull().default([]),
  // Array of { round, proposedBy, proposedAt, proposal, responseAt, response, status }
  currentRound: integer("current_round").notNull().default(1),
  maxRounds: integer("max_rounds").notNull().default(10),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  outcome: jsonb("outcome"), // final agreed terms
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
