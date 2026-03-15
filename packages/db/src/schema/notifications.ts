import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // booking_update | event_state | agent_action | system | permit_update
  channel: text("channel").notNull().default("in_app"), // in_app | email | sms | push
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").notNull().default({}), // extra context (eventId, bookingId, etc.)
  readAt: timestamp("read_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
