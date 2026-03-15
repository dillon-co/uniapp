import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, permits, cities } from "@uniapp/db";

export interface PermitAgentOptions {
  eventId: string;
  cityId: string;
}

export interface PermitApplication {
  permitType: string;
  required: boolean;
  applicationData: Record<string, unknown>;
  estimatedProcessingDays: number;
  notes: string;
}

export interface PermitAgentResult {
  eventId: string;
  cityId: string;
  permits: PermitApplication[];
  summary: string;
  urgentIssues: string[];
  totalCostUsd: number;
}

export class PermitAgent {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generatePermitApplications(options: PermitAgentOptions): Promise<PermitAgentResult> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, options.eventId),
    });
    if (!event) throw new Error(`Event ${options.eventId} not found`);

    const city = await this.db.query.cities.findFirst({
      where: eq(cities.id, options.cityId),
    });
    if (!city) throw new Error(`City ${options.cityId} not found`);

    const prompt = `You are an expert city permit advisor. Analyze the following event and generate permit applications.

Event Details:
- Title: ${event.title}
- Type: ${event.type}
- Expected Attendance: ${event.attendanceMax ?? "unknown"}
- Start Date: ${event.startDate?.toISOString() ?? "TBD"}
- End Date: ${event.endDate?.toISOString() ?? "TBD"}
- City: ${city.name}, ${city.state ?? ""}
- Description: ${event.description ?? "No description provided"}

City Regulations (standard):
- Events over 500 attendees require assembly permit
- Events with amplified sound require noise permit
- Events serving food require food vendor license
- Events serving alcohol require liquor permit
- Street events require street closure permit
- Events with open flame require fire safety permit

Generate a JSON array of permit applications needed. For each permit return:
{
  "permitType": "noise|assembly|food|alcohol|street_closure|fire_safety",
  "required": boolean,
  "applicationData": { ... relevant fields ... },
  "estimatedProcessingDays": number,
  "notes": "string"
}

Also provide a summary and list any urgent issues.

Respond with valid JSON: { "permits": [...], "summary": "string", "urgentIssues": ["..."] }`;

    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    let parsed: { permits: PermitApplication[]; summary: string; urgentIssues: string[] };
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text);
    } catch {
      parsed = {
        permits: [
          {
            permitType: "assembly",
            required: true,
            applicationData: {
              eventName: event.title,
              expectedAttendance: event.attendanceMax,
              startDate: event.startDate?.toISOString(),
              endDate: event.endDate?.toISOString(),
            },
            estimatedProcessingDays: 14,
            notes: "Standard assembly permit required",
          },
        ],
        summary: "Assembly permit required for this event",
        urgentIssues: [],
      };
    }

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalCostUsd = (inputTokens * 0.000015 + outputTokens * 0.000075);

    return {
      eventId: options.eventId,
      cityId: options.cityId,
      ...parsed,
      totalCostUsd,
    };
  }

  async createPermitRecords(
    options: PermitAgentOptions,
    applications: PermitApplication[],
  ): Promise<Array<typeof permits.$inferSelect>> {
    const created: Array<typeof permits.$inferSelect> = [];

    for (const app of applications) {
      if (!app.required) continue;

      const trackingNumber = `PERMIT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [permit] = await this.db
        .insert(permits)
        .values({
          eventId: options.eventId,
          cityId: options.cityId,
          type: app.permitType,
          status: "draft",
          applicationData: app.applicationData,
          trackingNumber,
          notes: app.notes,
        })
        .returning();

      if (permit) created.push(permit);
    }

    return created;
  }
}
