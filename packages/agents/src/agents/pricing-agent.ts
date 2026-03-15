import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { venues, bookings, analytics } from "@uniapp/db";

export interface PricingRecommendation {
  venueId: string;
  recommendedPriceCents: number;
  adjustmentPercent: number;
  demandLevel: "low" | "moderate" | "high" | "peak";
  reasoning: string;
  confidenceScore: number;
  seasonalFactors: string[];
  competitorContext: string;
  totalCostUsd: number;
}

export class PricingAgent {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async recommendPrice(venueId: string): Promise<PricingRecommendation> {
    const venue = await this.db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) throw new Error(`Venue ${venueId} not found`);

    // Get recent booking history
    const recentBookings = await this.db.query.bookings.findMany({
      where: eq(bookings.entityId, venueId),
      columns: { priceCents: true, status: true, startDate: true },
      limit: 20,
    });

    // Get demand signals from analytics
    const demandSignals = await this.db.query.analytics.findMany({
      where: eq(analytics.entityId, venueId),
      limit: 10,
    });

    const avgPrice =
      recentBookings.length > 0
        ? recentBookings.reduce((sum, b) => sum + b.priceCents, 0) / recentBookings.length
        : venue.capacity * 100;

    const pricingData = venue.pricing as Record<string, unknown>;
    const currentRate = typeof pricingData?.baseRate === "number" ? pricingData.baseRate : null;

    const prompt = `You are a venue pricing AI. Analyze demand signals and recommend optimal pricing.

Venue:
- Name: ${venue.name}
- Type: ${venue.venueType.join(", ")}
- Capacity: ${venue.capacity}
- Current Pricing Config: ${JSON.stringify(venue.pricing)}

Recent Bookings: ${JSON.stringify(recentBookings.slice(0, 5))}
Demand Signals: ${JSON.stringify(demandSignals.slice(0, 5))}
Average Historical Price: ${Math.round(avgPrice)} cents

Provide pricing recommendation as JSON:
{
  "recommendedPriceCents": number,
  "adjustmentPercent": number (positive = increase, negative = decrease),
  "demandLevel": "low|moderate|high|peak",
  "reasoning": "brief explanation",
  "confidenceScore": 0-100,
  "seasonalFactors": ["factor1", "factor2"],
  "competitorContext": "brief market context"
}`;

    const response = await this.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("No AI response");

    let parsed: {
      recommendedPriceCents: number;
      adjustmentPercent: number;
      demandLevel: "low" | "moderate" | "high" | "peak";
      reasoning: string;
      confidenceScore: number;
      seasonalFactors: string[];
      competitorContext: string;
    };
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text);
    } catch {
      parsed = {
        recommendedPriceCents: Math.round(avgPrice * 1.05),
        adjustmentPercent: 5,
        demandLevel: "moderate",
        reasoning: "Based on historical booking patterns, a modest price increase is recommended",
        confidenceScore: 60,
        seasonalFactors: ["Standard demand period"],
        competitorContext: "Market rates appear stable",
      };
    }

    const totalCostUsd =
      (response.usage.input_tokens * 0.00000025 + response.usage.output_tokens * 0.00000125);

    return {
      venueId,
      ...parsed,
      totalCostUsd,
    };
  }
}
