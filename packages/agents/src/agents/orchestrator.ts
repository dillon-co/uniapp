import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { events, approvalGates, eventHistory } from "@uniapp/db";
import type { Edl } from "@uniapp/edl";
import { AgentRuntime } from "../runtime.js";

export interface OrchestratorOptions {
  eventId: string;
  actorId: string;
  maxBudgetUsd?: number;
}

export interface OrchestratorResult {
  plan: EventPlan;
  subagentResults: Record<string, string>;
  approvalGateId: string | null;
  durationMs: number;
  totalCostUsd: number;
}

export interface EventPlan {
  eventId: string;
  venueRecommendations: string;
  vendorRecommendations: string;
  permitRequirements: string;
  staffingPlan: string;
  budgetSummary: string;
  conflicts: string[];
  nextSteps: string[];
  generatedAt: string;
}

export class OrchestratorAgent {
  private runtime: AgentRuntime;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.runtime = new AgentRuntime(db);
  }

  async orchestrate(options: OrchestratorOptions): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const { eventId, actorId, maxBudgetUsd = 20 } = options;

    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) throw new Error(`Event ${eventId} not found`);

    const edl = event.edl as Edl;
    const perAgentBudget = maxBudgetUsd / 4;

    // Run specialist subagents in parallel (independent tasks)
    const [venueResult, vendorResult, permitResult, staffingResult] =
      await Promise.allSettled([
        this.runtime.run({
          agentType: "venue-scout",
          eventId,
          actorId,
          task: `Find the best venue options for this event: "${event.title}".
Event type: ${edl.type}, attendance: ${edl.attendance.min}–${edl.attendance.max} people.
Location preference: ${edl.location.type}, area: ${edl.location.preferredArea ?? "any"}.
${event.budgetCents ? `Total budget: $${(event.budgetCents / 100).toLocaleString()}.` : ""}
Search for venues and provide top 3 recommendations with pros/cons and pricing.`,
          maxBudgetUsd: perAgentBudget,
        }),

        this.runtime.run({
          agentType: "vendor-coordinator",
          eventId,
          actorId,
          task: `Find suitable vendors for this event: "${event.title}".
Required vendor categories from EDL: ${JSON.stringify(edl.requirements?.vendors ?? [])}.
Event type: ${edl.type}, attendance: ${edl.attendance.max}.
Search for vendors in each required category and provide recommendations.`,
          maxBudgetUsd: perAgentBudget,
        }),

        this.runtime.run({
          agentType: "permit-processor",
          eventId,
          actorId,
          task: `Analyze permit requirements for event "${event.title}" (ID: ${eventId}).
Review city regulations, event type, and attendance size.
List all required permits, estimated lead times, and any regulatory risks.`,
          maxBudgetUsd: perAgentBudget,
        }),

        this.runtime.run({
          agentType: "volunteer-coordinator",
          eventId,
          actorId,
          task: `Create a volunteer staffing plan for "${event.title}".
Required volunteers from EDL: ${JSON.stringify(edl.requirements?.volunteers ?? {})}.
Attendance: ${edl.attendance.max} people.
Suggest role breakdown, shift structure, and minimum volunteer count.`,
          maxBudgetUsd: perAgentBudget,
        }),
      ]);

    const subagentResults = {
      venue: venueResult.status === "fulfilled" ? venueResult.value.result : `Error: ${(venueResult as PromiseRejectedResult).reason}`,
      vendor: vendorResult.status === "fulfilled" ? vendorResult.value.result : `Error: ${(vendorResult as PromiseRejectedResult).reason}`,
      permit: permitResult.status === "fulfilled" ? permitResult.value.result : `Error: ${(permitResult as PromiseRejectedResult).reason}`,
      staffing: staffingResult.status === "fulfilled" ? staffingResult.value.result : `Error: ${(staffingResult as PromiseRejectedResult).reason}`,
    };

    // Calculate total cost
    const totalCostUsd = [venueResult, vendorResult, permitResult, staffingResult]
      .reduce((sum, r) => sum + (r.status === "fulfilled" ? r.value.estimatedCostUsd : 0), 0);

    // Build unified event plan
    const plan: EventPlan = {
      eventId,
      venueRecommendations: subagentResults.venue,
      vendorRecommendations: subagentResults.vendor,
      permitRequirements: subagentResults.permit,
      staffingPlan: subagentResults.staffing,
      budgetSummary: event.budgetCents
        ? `Total budget: $${(event.budgetCents / 100).toLocaleString()}`
        : "No budget specified",
      conflicts: this.detectConflicts(subagentResults, edl),
      nextSteps: this.buildNextSteps(subagentResults),
      generatedAt: new Date().toISOString(),
    };

    // Record in event history
    await this.db.insert(eventHistory).values({
      eventId,
      actorId,
      action: "agent_action",
      note: `Orchestrator completed planning with ${Object.values(subagentResults).length} subagents`,
      diff: { plan: { ...plan, venueRecommendations: plan.venueRecommendations.slice(0, 200) } } as unknown as Record<string, unknown>,
    });

    // Create approval gate for organizer review
    const [gate] = await this.db.insert(approvalGates).values({
      eventId,
      type: "plan_review",
      title: "Review AI-Generated Event Plan",
      description: "Your event planning agents have completed their analysis. Review and approve the plan to proceed.",
      data: { plan, subagentResults: Object.fromEntries(
        Object.entries(subagentResults).map(([k, v]) => [k, v.slice(0, 500)])
      )} as unknown as Record<string, unknown>,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    }).returning({ id: approvalGates.id });

    return {
      plan,
      subagentResults,
      approvalGateId: gate?.id ?? null,
      durationMs: Date.now() - startTime,
      totalCostUsd,
    };
  }

  private detectConflicts(results: Record<string, string>, edl: Edl): string[] {
    const conflicts: string[] = [];

    if (results.venue.includes("Error") || results.venue.includes("No venues found")) {
      conflicts.push("No suitable venues found — consider expanding location or date flexibility");
    }
    if (results.permit.includes("Error")) {
      conflicts.push("Permit analysis failed — manual permit review required");
    }
    if (edl.requirements?.volunteers && !results.staffing.includes("Error")) {
      const requiredMin = typeof edl.requirements.volunteers === "object"
        ? (edl.requirements.volunteers as { min?: number }).min ?? 0
        : 0;
      if (requiredMin > 50) {
        conflicts.push(`Large volunteer requirement (${requiredMin}+) — early recruitment recommended`);
      }
    }

    return conflicts;
  }

  private buildNextSteps(results: Record<string, string>): string[] {
    const steps: string[] = [];
    if (!results.venue.includes("Error")) steps.push("Contact top venue recommendation to confirm availability");
    if (!results.vendor.includes("Error")) steps.push("Send bid requests to recommended vendors");
    if (!results.permit.includes("Error")) steps.push("Begin permit applications immediately (allow lead time)");
    if (!results.staffing.includes("Error")) steps.push("Post volunteer shifts to platform");
    steps.push("Approve this plan to enable agent-negotiated bookings");
    return steps;
  }
}
