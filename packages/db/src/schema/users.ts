import { pgTable, uuid, text, timestamp, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { cities } from "./cities.js";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  roles: text("roles").array().notNull().default([]),
  cityId: uuid("city_id").references(() => cities.id),
  preferences: jsonb("preferences").notNull().default({}),
  trustScore: doublePrecision("trust_score").default(50.0),
  refreshTokenHash: text("refresh_token_hash"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
