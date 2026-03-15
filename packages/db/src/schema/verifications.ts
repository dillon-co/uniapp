import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(), // user | organization | vendor | venue
  entityId: uuid("entity_id").notNull(),
  verificationType: text("verification_type").notNull(), // identity | business | insurance | license
  status: text("status").notNull().default("pending"),
  // pending | under_review | verified | rejected | expired
  documents: jsonb("documents").notNull().default([]),
  // Array of { name, url, uploadedAt }
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by"),
  notes: text("notes"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
