import { pgTable, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { volunteerShifts } from "./shifts.js";
import { users } from "./users.js";

export const shiftWaitlist = pgTable("shift_waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  shiftId: uuid("shift_id").notNull().references(() => volunteerShifts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  position: integer("position").notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
