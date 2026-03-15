import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export interface Constraint {
  type: "hard" | "soft";
  category: "date" | "budget" | "capacity" | "vendor" | "permit" | "location" | "other";
  description: string;
  value?: unknown;
  priority?: number; // lower = higher priority for soft constraints
}

export interface ConflictInput {
  eventTitle: string;
  eventId: string;
  constraints: Constraint[];
  conflictDescription: string;
  availableAlternatives?: string[];
}

const ResolutionSchema = z.object({
  resolved: z.boolean().describe("Whether the conflict was fully resolved"),
  resolution: z.string().describe("The recommended resolution action"),
  rationale: z.string().describe("Why this resolution is optimal"),
  tradeoffs: z.array(z.string()).describe("Trade-offs the organizer should understand"),
  alternativeOptions: z.array(z.object({
    label: z.string(),
    description: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
  })).describe("Alternative resolutions if primary doesn't work"),
  violatesHardConstraint: z.boolean().describe("True if resolution requires violating a hard constraint"),
  escalationRequired: z.boolean().describe("Whether human intervention is needed"),
  escalationReason: z.string().optional().describe("Why escalation is needed"),
  relaxedConstraints: z.array(z.string()).describe("Which soft constraints were relaxed"),
});

export type ConstraintResolution = z.infer<typeof ResolutionSchema>;

export class ConstraintSolver {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY required");
    this.client = new Anthropic({ apiKey });
  }

  async solve(input: ConflictInput): Promise<ConstraintResolution> {
    const hardConstraints = input.constraints.filter((c) => c.type === "hard");
    const softConstraints = input.constraints
      .filter((c) => c.type === "soft")
      .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));

    const prompt = `You are an expert event planning constraint solver.

Event: "${input.eventTitle}" (ID: ${input.eventId})

CONFLICT:
${input.conflictDescription}

HARD CONSTRAINTS (must never be violated):
${hardConstraints.map((c, i) => `${i + 1}. [${c.category.toUpperCase()}] ${c.description}`).join("\n") || "None"}

SOFT CONSTRAINTS (can be relaxed in priority order — lower number = higher priority):
${softConstraints.map((c) => `P${c.priority ?? 5}. [${c.category.toUpperCase()}] ${c.description}`).join("\n") || "None"}

${input.availableAlternatives?.length ? `AVAILABLE ALTERNATIVES:\n${input.availableAlternatives.map((a, i) => `${i + 1}. ${a}`).join("\n")}` : ""}

Find the optimal resolution that:
1. Never violates hard constraints
2. Minimizes soft constraint violations (relax lower-priority ones first)
3. Proposes creative alternatives when direct resolution isn't possible
4. Escalates to human only when truly necessary`;

    const response = await this.client.messages.parse({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "max", // deepest reasoning for constraint problems
        format: zodOutputFormat(ResolutionSchema),
      },
      messages: [{ role: "user", content: prompt }],
    });

    const resolution = response.parsed_output;
    if (!resolution) {
      throw new Error("Constraint solver failed to produce a structured resolution");
    }

    return resolution;
  }

  /** Convenience: check if a set of bookings would exceed budget. */
  async checkBudgetConstraint(params: {
    eventTitle: string;
    eventId: string;
    budgetCents: number;
    proposedSpendCents: number;
    breakdownByCategory: Record<string, number>;
  }): Promise<ConstraintResolution> {
    const overage = params.proposedSpendCents - params.budgetCents;
    const breakdown = Object.entries(params.breakdownByCategory)
      .map(([cat, cents]) => `  ${cat}: $${(cents / 100).toLocaleString()}`)
      .join("\n");

    return this.solve({
      eventTitle: params.eventTitle,
      eventId: params.eventId,
      conflictDescription: `Proposed spend ($${(params.proposedSpendCents / 100).toLocaleString()}) exceeds budget by $${(overage / 100).toLocaleString()}.\n\nBreakdown:\n${breakdown}`,
      constraints: [
        {
          type: "hard",
          category: "budget",
          description: `Total spend must not exceed $${(params.budgetCents / 100).toLocaleString()}`,
          value: params.budgetCents,
        },
        {
          type: "soft",
          category: "vendor",
          description: "Maintain planned vendor count and quality",
          priority: 3,
        },
        {
          type: "soft",
          category: "other",
          description: "Preserve venue selection",
          priority: 1,
        },
      ],
    });
  }
}
