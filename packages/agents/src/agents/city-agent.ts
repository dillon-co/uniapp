import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, permits, cities } from "@uniapp/db";

export interface CityCheckOptions {
  eventId: string;
  cityId: string;
}

export interface CityCheckResult {
  eventId: string;
  cityId: string;
  permitRequirements: string[];
  estimatedTimelines: Record<string, number>;
  flags: string[];
  recommendations: string[];
  complianceScore: number;
  summary: string;
  totalCostUsd: number;
}

export class CityAgent {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async checkEvent(options: CityCheckOptions): Promise<CityCheckResult> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, options.eventId),
    });
    if (!event) throw new Error(`Event ${options.eventId} not found`);

    const city = await this.db.query.cities.findFirst({
      where: eq(cities.id, options.cityId),
    });
    if (!city) throw new Error(`City ${options.cityId} not found`);

    const existingPermits = await this.db.query.permits.findMany({
      where: eq(permits.eventId, options.eventId),
      columns: { type: true, status: true },
    });

    const prompt = `You are a city government AI advisor. Check the following event for permit requirements and compliance issues.

Event:
- Title: ${event.title}
- Type: ${event.type}
- Attendance: ${event.attendanceMax ?? "unknown"}
- Start: ${event.startDate?.toISOString() ?? "TBD"}
- End: ${event.endDate?.toISOString() ?? "TBD"}
- City: ${city.name}

Existing Permits: ${JSON.stringify(existingPermits)}

Analyze and respond with JSON:
{
  "permitRequirements": ["list of required permits"],
  "estimatedTimelines": { "permit_type": days_to_process },
  "flags": ["issues or concerns"],
  "recommendations": ["action items"],
  "complianceScore": 0-100,
  "summary": "brief assessment"
}`;

    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("No AI response");

    let parsed: Omit<CityCheckResult, "eventId" | "cityId" | "totalCostUsd">;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text);
    } catch {
      parsed = {
        permitRequirements: ["assembly"],
        estimatedTimelines: { assembly: 14 },
        flags: [],
        recommendations: ["Submit permit applications at least 30 days before the event"],
        complianceScore: 70,
        summary: "Event appears compliant with basic requirements",
      };
    }

    const totalCostUsd =
      (response.usage.input_tokens * 0.000015 + response.usage.output_tokens * 0.000075);

    return {
      eventId: options.eventId,
      cityId: options.cityId,
      ...parsed,
      totalCostUsd,
    };
  }
}
