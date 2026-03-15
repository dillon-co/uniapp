import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { users } from "./users.js";

export const approvalGates = pgTable("approval_gates", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  type: text("type").notNull(),
  // plan_review | booking_confirmation | budget_threshold | contract_signing | agent_action
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected | expired | timed_out
  title: text("title").notNull(),
  description: text("description"),
  data: jsonb("data").notNull().default({}), // context for the approval (proposal, booking details, etc.)
  agentRunId: text("agent_run_id"),          // which agent triggered this gate
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  responderId: uuid("responder_id").references(() => users.id),
  note: text("note"),                        // organizer feedback on approve/reject
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
