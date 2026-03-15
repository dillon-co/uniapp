import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { venues } from "./venues.js";
import { users } from "./users.js";
import { bookings } from "./bookings.js";
import { events } from "./events.js";

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  venueId: uuid("venue_id").notNull().references(() => venues.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id).unique(),
  eventId: uuid("event_id").references(() => events.id),
  rating: integer("rating").notNull(), // 1–5
  title: text("title"),
  body: text("body"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
