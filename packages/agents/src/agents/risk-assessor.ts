import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, permits, bookings, analytics } from "@uniapp/db";

export interface RiskReport {
  eventId: string;
  overallRiskScore: number; // 0-100
  riskLevel: "minimal" | "low" | "moderate" | "high" | "critical";
  categories: {
    weatherRisk: number;
    crowdSafety: number;
    financialRisk: number;
    permitRisk: number;
    vendorReliability: number;
  };
  topRisks: Array<{ risk: string; severity: "low" | "medium" | "high"; mitigation: string }>;
  recommendations: string[];
  contingencyTriggers: string[];
  totalCostUsd: number;
}

export class RiskAssessor {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async assess(eventId: string): Promise<RiskReport> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) throw new Error(`Event ${eventId} not found`);

    const [eventPermits, eventBookings] = await Promise.all([
      this.db.query.permits.findMany({
        where: eq(permits.eventId, eventId),
        columns: { type: true, status: true },
      }),
      this.db.query.bookings.findMany({
        where: eq(bookings.eventId, eventId),
        columns: { entityType: true, status: true, priceCents: true, paidAt: true },
      }),
    ]);

    const totalBudgetCents = eventBookings
      .filter((b) => ["confirmed", "completed"].includes(b.status))
      .reduce((sum, b) => sum + b.priceCents, 0);
    const unpaidCents = eventBookings
      .filter((b) => ["confirmed", "completed"].includes(b.status) && !b.paidAt)
      .reduce((sum, b) => sum + b.priceCents, 0);
    const pendingPermitTypes = eventPermits
      .filter((p) => !["approved"].includes(p.status))
      .map((p) => p.type);

    const prompt = `You are a professional event risk assessment AI. Analyze this event and provide a comprehensive risk score.

Event:
- Title: ${event.title}
- Type: ${event.type}
- Attendance: ${event.attendanceMax ?? "unknown"}
- Start Date: ${event.startDate?.toISOString() ?? "TBD"}
- Status: ${event.status}

Permits Status:
- Total Permits: ${eventPermits.length}
- Pending/Missing Permits: ${pendingPermitTypes.join(", ") || "none"}
- All Approved: ${eventPermits.every((p) => p.status === "approved") ? "yes" : "no"}

Financial Status:
- Total Budget: $${(totalBudgetCents / 100).toLocaleString()}
- Unpaid Amount: $${(unpaidCents / 100).toLocaleString()}
- Payment Rate: ${totalBudgetCents > 0 ? Math.round(((totalBudgetCents - unpaidCents) / totalBudgetCents) * 100) : 0}%
- Vendor Bookings: ${eventBookings.filter((b) => b.entityType === "vendor").length}

Provide risk assessment as JSON:
{
  "overallRiskScore": 0-100,
  "riskLevel": "minimal|low|moderate|high|critical",
  "categories": {
    "weatherRisk": 0-100,
    "crowdSafety": 0-100,
    "financialRisk": 0-100,
    "permitRisk": 0-100,
    "vendorReliability": 0-100
  },
  "topRisks": [
    { "risk": "description", "severity": "low|medium|high", "mitigation": "action" }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "contingencyTriggers": ["trigger condition 1", "trigger condition 2"]
}`;

    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("No AI response");

    let parsed: Omit<RiskReport, "eventId" | "totalCostUsd">;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text);
    } catch {
      const permitRisk = pendingPermitTypes.length > 0 ? 70 : 10;
      const financialRisk = unpaidCents > totalBudgetCents * 0.3 ? 60 : 20;
      const overall = Math.round((permitRisk + financialRisk + 30) / 3);
      parsed = {
        overallRiskScore: overall,
        riskLevel: overall > 70 ? "high" : overall > 40 ? "moderate" : "low",
        categories: {
          weatherRisk: 25,
          crowdSafety: 30,
          financialRisk,
          permitRisk,
          vendorReliability: 20,
        },
        topRisks: [
          {
            risk: "Incomplete permit approvals",
            severity: "high",
            mitigation: "Submit and follow up on all pending permits immediately",
          },
        ],
        recommendations: ["Ensure all permits are approved at least 2 weeks before the event"],
        contingencyTriggers: ["Any permit rejection", "Vendor cancellation within 72 hours"],
      };
    }

    const totalCostUsd =
      (response.usage.input_tokens * 0.000015 + response.usage.output_tokens * 0.000075);

    return { eventId, ...parsed, totalCostUsd };
  }
}
