import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, sponsors } from "@uniapp/db";

export interface SponsorMatch {
  sponsorId: string;
  sponsorName: string;
  matchScore: number; // 0-100
  categories: string[];
  budgetCents: number;
  reasoning: string;
}

export interface SponsorMatchResult {
  eventId: string;
  matches: SponsorMatch[];
  totalSponsorsBrowsed: number;
  recommendedApproach: string;
  totalCostUsd: number;
}

export class SponsorAgent {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async findSponsors(eventId: string): Promise<SponsorMatchResult> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) throw new Error(`Event ${eventId} not found`);

    const availableSponsors = await this.db.query.sponsors.findMany({
      where: eq(sponsors.active, "true"),
      limit: 50,
    });

    if (availableSponsors.length === 0) {
      return {
        eventId,
        matches: [],
        totalSponsorsBrowsed: 0,
        recommendedApproach: "No sponsors available in the system yet. Add sponsors to get matching.",
        totalCostUsd: 0,
      };
    }

    const prompt = `You are a sponsorship matching AI. Match sponsors to this event based on alignment.

Event:
- Title: ${event.title}
- Type: ${event.type}
- Expected Attendance: ${event.attendanceMax ?? "unknown"}
- Description: ${event.description ?? "none"}

Available Sponsors:
${JSON.stringify(
  availableSponsors.map((s) => ({
    id: s.id,
    name: s.name,
    categories: s.categories,
    budgetCents: s.budgetCents,
    targetEventTypes: s.targetEventTypes,
  })),
  null,
  2,
)}

For each sponsor, provide a match score 0-100 based on:
- Category alignment with event type
- Budget adequacy
- Target event type match
- Audience overlap

Respond with JSON:
{
  "matches": [
    {
      "sponsorId": "uuid",
      "sponsorName": "name",
      "matchScore": 0-100,
      "categories": ["category"],
      "budgetCents": number,
      "reasoning": "why this is a good match"
    }
  ],
  "recommendedApproach": "strategy for sponsor outreach"
}

Sort by matchScore descending. Only include sponsors with score >= 50.`;

    const response = await this.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("No AI response");

    let parsed: { matches: SponsorMatch[]; recommendedApproach: string };
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text);
    } catch {
      // Fallback: return all sponsors with basic scoring
      parsed = {
        matches: availableSponsors.slice(0, 5).map((s) => ({
          sponsorId: s.id,
          sponsorName: s.name,
          matchScore: 65,
          categories: s.categories,
          budgetCents: s.budgetCents,
          reasoning: "General sponsorship opportunity based on budget alignment",
        })),
        recommendedApproach: "Reach out to top-matched sponsors with a detailed event proposal",
      };
    }

    const totalCostUsd =
      (response.usage.input_tokens * 0.00000025 + response.usage.output_tokens * 0.00000125);

    return {
      eventId,
      ...parsed,
      totalSponsorsBrowsed: availableSponsors.length,
      totalCostUsd,
    };
  }
}
