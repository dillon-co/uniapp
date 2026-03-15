import { pgTable, uuid, text, timestamp, jsonb, bigint } from "drizzle-orm/pg-core";
import { bookings } from "./bookings.js";

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  stripeChargeId: text("stripe_charge_id"),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"),
  // pending | succeeded | failed | refunded | partially_refunded
  paymentMethod: text("payment_method").default("card"),
  metadata: jsonb("metadata"),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  refundAmountCents: bigint("refund_amount_cents", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
