import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { vendors, events, bids } from "@uniapp/db";
import { AgentRuntime } from "../runtime.js";
import type { Edl } from "@uniapp/edl";

export interface VendorAgentOptions {
  vendorId: string;
  actorId: string;
  maxBudgetUsd?: number;
}

export interface BidProposal {
  eventId: string;
  priceCents: number;
  quantity: number;
  deliveryTerms: string;
  conditions: string;
  notes: string;
}

export class VendorAgent {
  private runtime: AgentRuntime;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.runtime = new AgentRuntime(db);
  }

  async discoverAndBid(options: VendorAgentOptions): Promise<BidProposal[]> {
    const vendor = await this.db.query.vendors.findFirst({
      where: eq(vendors.id, options.vendorId),
    });
    if (!vendor) throw new Error("Vendor not found");

    const pricing = vendor.pricingRange as {
      minCents: number;
      maxCents: number;
      unit: string;
    };

    // Find events that need this vendor's services and haven't been bid on
    const matchingEvents = await this.db.query.events.findMany({
      where: and(
        sql`${events.status} IN ('planning', 'negotiating')`,
        sql`${events.edl}::jsonb @? '$.requirements.vendors[*] ? (@.category == "${vendor.categories[0]}")'`,
      ),
      limit: 10,
      columns: { id: true, title: true, edl: true, attendanceMax: true, budgetCents: true },
    });

    // Filter out events already bid on
    const existingBids = await this.db.query.bids.findMany({
      where: and(
        eq(bids.vendorId, options.vendorId),
        sql`${bids.status} NOT IN ('rejected', 'expired', 'withdrawn')`,
      ),
      columns: { eventId: true },
    });

    const bidEventIds = new Set(existingBids.map((b) => b.eventId));
    const targets = matchingEvents.filter((e) => !bidEventIds.has(e.id));

    const proposals: BidProposal[] = [];

    for (const event of targets.slice(0, 5)) {
      const edl = event.edl as Edl;
      const vendorReq = edl.requirements?.vendors?.find(
        (v) => v.category === vendor.categories[0],
      );
      const quantity = vendorReq?.count ?? 1;

      const result = await this.runtime.run({
        agentType: "vendor-coordinator",
        eventId: event.id,
        actorId: options.actorId,
        task: `Generate a bid proposal for vendor "${vendor.name}" (${vendor.categories.join(", ")}) for event "${event.title}".

Vendor pricing: $${(pricing.minCents / 100).toLocaleString()}–$${(pricing.maxCents / 100).toLocaleString()}/${pricing.unit}
Event attendance: ${event.attendanceMax ?? "unknown"}
Required quantity: ${quantity}
Event budget: ${event.budgetCents ? "$" + (event.budgetCents / 100).toLocaleString() : "not specified"}

Generate a competitive but fair bid. Include:
- Total price in USD (as an integer number of cents)
- Quantity and unit
- Delivery/service terms
- Any conditions
- A brief value proposition

Format your response as: PRICE_CENTS: <number>, then the rest of your proposal.`,
        maxBudgetUsd: options.maxBudgetUsd ?? 1,
      });

      const priceCents = this.extractPriceCents(result.result, pricing.minCents, pricing.maxCents, quantity);

      proposals.push({
        eventId: event.id,
        priceCents,
        quantity,
        deliveryTerms: "Per event agreement",
        conditions: "Subject to availability confirmation",
        notes: result.result.slice(0, 500),
      });
    }

    return proposals;
  }

  async submitBids(vendorId: string, proposals: BidProposal[]): Promise<void> {
    for (const proposal of proposals) {
      await this.db.insert(bids).values({
        vendorId,
        eventId: proposal.eventId,
        status: "pending",
        proposal: proposal as unknown as Record<string, unknown>,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
    }
  }

  private extractPriceCents(text: string, minCents: number, maxCents: number, quantity: number): number {
    const match = text.match(/PRICE_CENTS:\s*(\d+)/i);
    if (match?.[1]) return parseInt(match[1], 10) * quantity;
    return Math.round((minCents + maxCents) / 2) * quantity;
  }
}
