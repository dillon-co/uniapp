import { pgTable, uuid, text, timestamp, jsonb, integer, doublePrecision } from "drizzle-orm/pg-core";
import { events } from "./events.js";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id),
  agentType: text("agent_type").notNull(),
  agentEntityId: uuid("agent_entity_id").notNull(),
  action: text("action").notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  toolName: text("tool_name"),
  durationMs: integer("duration_ms"),
  costUsd: doublePrecision("cost_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
