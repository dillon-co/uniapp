import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { users } from "./users.js";

export const eventHistory = pgTable("event_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(), // state_change | field_update | note
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  diff: jsonb("diff"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
