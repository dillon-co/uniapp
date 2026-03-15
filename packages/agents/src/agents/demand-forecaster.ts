import Anthropic from "@anthropic-ai/sdk";
import { eq, desc, and } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, analytics } from "@uniapp/db";

export interface ForecastResult {
  eventId: string;
  predictedAttendance: { low: number; mid: number; high: number };
  optimalPricingUsd: { minimum: number; suggested: number; premium: number };
  vendorDemand: Record<string, { quantity: number; estimatedSpendCents: number }>;
  keyInsights: string[];
  confidenceScore: number;
  forecastHorizonDays: number;
  totalCostUsd: number;
}

export class DemandForecaster {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async forecast(eventId: string): Promise<ForecastResult> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) throw new Error(`Event ${eventId} not found`);

    // Get historical analytics for similar events
    const historicalData = await this.db.query.analytics.findMany({
      where: and(eq(analytics.entityType, "event"), eq(analytics.metric, "attendance")),
      orderBy: [desc(analytics.recordedAt)],
      limit: 50,
    });

    const prompt = `You are an expert event analytics AI. Forecast demand for the following event based on historical data.

Event Details:
- Title: ${event.title}
- Type: ${event.type}
- Expected Capacity: ${event.attendanceMax ?? "unknown"}
- Start Date: ${event.startDate?.toISOString() ?? "TBD"}
- Description: ${event.description ?? "None provided"}

Historical Data Points (similar events):
${historicalData.length > 0 ? JSON.stringify(historicalData.slice(0, 10), null, 2) : "No historical data available"}

Provide a demand forecast as JSON:
{
  "predictedAttendance": { "low": number, "mid": number, "high": number },
  "optimalPricingUsd": { "minimum": number, "suggested": number, "premium": number },
  "vendorDemand": {
    "catering": { "quantity": number, "estimatedSpendCents": number },
    "audio_visual": { "quantity": number, "estimatedSpendCents": number },
    "security": { "quantity": number, "estimatedSpendCents": number },
    "transportation": { "quantity": number, "estimatedSpendCents": number }
  },
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "confidenceScore": 0-100,
  "forecastHorizonDays": number
}`;

    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("No AI response");

    let parsed: Omit<ForecastResult, "eventId" | "totalCostUsd">;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text);
    } catch {
      const cap = event.attendanceMax ?? 500;
      parsed = {
        predictedAttendance: { low: Math.round(cap * 0.6), mid: Math.round(cap * 0.8), high: cap },
        optimalPricingUsd: { minimum: 25, suggested: 50, premium: 100 },
        vendorDemand: {
          catering: { quantity: 2, estimatedSpendCents: 500000 },
          audio_visual: { quantity: 1, estimatedSpendCents: 200000 },
          security: { quantity: 3, estimatedSpendCents: 150000 },
          transportation: { quantity: 1, estimatedSpendCents: 100000 },
        },
        keyInsights: [
          "Based on event type, expect strong weekend attendance",
          "Early bird pricing recommended",
          "Plan for 20% above predicted attendance for vendor orders",
        ],
        confidenceScore: 65,
        forecastHorizonDays: 90,
      };
    }

    const totalCostUsd =
      (response.usage.input_tokens * 0.000015 + response.usage.output_tokens * 0.000075);

    return { eventId, ...parsed, totalCostUsd };
  }
}
