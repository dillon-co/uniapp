import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const volunteers = pgTable("volunteers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  skills: text("skills").array().notNull().default([]),
  availability: jsonb("availability").notNull().default({}), // { weeklyBlocks, blockedDates }
  preferences: jsonb("preferences").notNull().default({}),   // { maxDistanceKm, eventTypes, notificationFreq }
  verifiedSkills: jsonb("verified_skills").notNull().default({}), // { skill: { verifiedAt, documentId } }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
