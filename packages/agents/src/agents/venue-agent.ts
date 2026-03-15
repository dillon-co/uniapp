import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { venues, bookings } from "@uniapp/db";
import { AgentRuntime } from "../runtime.js";

export interface VenueAgentOptions {
  venueId: string;
  bookingRequestId: string;
  eventId: string;
  actorId: string;
  requestedStart: Date;
  requestedEnd: Date;
  requestedPriceCents: number;
}

export interface VenueAgentDecision {
  action: "accept" | "reject" | "counter";
  counterPriceCents?: number;
  counterStartDate?: string;
  counterEndDate?: string;
  rationale: string;
}

export class VenueAgent {
  private runtime: AgentRuntime;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.runtime = new AgentRuntime(db);
  }

  async evaluateBookingRequest(options: VenueAgentOptions): Promise<VenueAgentDecision> {
    const venue = await this.db.query.venues.findFirst({
      where: eq(venues.id, options.venueId),
    });
    if (!venue) throw new Error("Venue not found");

    const pricing = venue.pricing as {
      baseRateCents: number;
      unit: string;
      tiers: Array<{ label: string; rateCents: number; minHours?: number; maxHours?: number }>;
    };
    const rules = venue.rules as { minBookingHours?: number; alcoholAllowed?: boolean; notes?: string };

    const durationHours = Math.ceil(
      (options.requestedEnd.getTime() - options.requestedStart.getTime()) / (1000 * 60 * 60),
    );

    const task = `You are the venue agent for "${venue.name}". Evaluate this booking request:

Booking Details:
- Event ID: ${options.eventId}
- Requested dates: ${options.requestedStart.toISOString()} to ${options.requestedEnd.toISOString()} (${durationHours} hours)
- Offered price: $${(options.requestedPriceCents / 100).toLocaleString()}

Venue Details:
- Capacity: ${venue.capacity}
- Types: ${venue.venueType.join(", ")}
- Base rate: $${(pricing.baseRateCents / 100).toLocaleString()}/${pricing.unit}
- Min booking: ${rules.minBookingHours ?? 2} hours
- Rules: ${rules.notes ?? "Standard venue rules apply"}

Pricing tiers: ${JSON.stringify(pricing.tiers)}

First check availability using the check_venue_availability tool for the requested dates.
Then decide: accept the offer, reject it, or counter with better terms.
Apply pricing rules — calculate the fair rate for ${durationHours} hours.
If offered price is within 15% of calculated rate, accept. Otherwise counter with the calculated rate.
Respond with your decision and clear rationale.`;

    const result = await this.runtime.run({
      agentType: "venue-scout",
      eventId: options.eventId,
      actorId: options.actorId,
      task,
      context: { venueId: options.venueId },
      maxBudgetUsd: 2,
    });

    // Parse decision from result
    return this.parseDecision(result.result, pricing.baseRateCents, durationHours);
  }

  private parseDecision(
    result: string,
    baseRateCents: number,
    durationHours: number,
  ): VenueAgentDecision {
    const lowerResult = result.toLowerCase();
    const calculatedRate = baseRateCents * durationHours;

    if (lowerResult.includes("not available") || lowerResult.includes("unavailable") || lowerResult.includes("conflict")) {
      return { action: "reject", rationale: "Venue unavailable for requested dates. " + result.slice(0, 300) };
    }

    if (lowerResult.includes("accept") && !lowerResult.includes("counter")) {
      return { action: "accept", rationale: result.slice(0, 300) };
    }

    return {
      action: "counter",
      counterPriceCents: calculatedRate,
      rationale: result.slice(0, 300),
    };
  }
}
