import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { users } from "./users.js";

export const volunteerShifts = pgTable("volunteer_shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  role: text("role").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  slots: integer("slots").notNull().default(1),
  filled: integer("filled").notNull().default(0),
  requirements: text("requirements").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shiftSignups = pgTable("shift_signups", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").notNull().references(() => volunteerShifts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("registered"), // registered | confirmed | checked_in | completed | cancelled
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
