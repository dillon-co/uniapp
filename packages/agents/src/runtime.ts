import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Database } from "@uniapp/db";
import { auditLog } from "@uniapp/db";
import { createVenueTools } from "./tools/venue-tools.js";
import { createBookingTools } from "./tools/booking-tools.js";
import { createEventTools } from "./tools/event-tools.js";
import { createVendorTools } from "./tools/vendor-tools.js";

export type AgentType = "orchestrator" | "venue-scout" | "vendor-coordinator" | "volunteer-coordinator" | "permit-processor";

export interface AgentRunOptions {
  agentType: AgentType;
  eventId: string;
  actorId: string;
  task: string;
  context?: Record<string, unknown>;
  maxTurns?: number;
  maxBudgetUsd?: number;
}

export interface AgentRunResult {
  result: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  toolCallCount: number;
}

// Opus 4.6 pricing (per million tokens)
const INPUT_PRICE_PER_M = 5.0;
const OUTPUT_PRICE_PER_M = 25.0;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_PRICE_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M;
}

function buildSystemPrompt(agentType: AgentType, context: Record<string, unknown>): string {
  const base = `You are the UniApp ${agentType} agent, an expert AI assistant for city event coordination.

Your goal is to complete the given task efficiently using the available tools.
Always explain what you're doing before calling a tool.
After completing your task, provide a clear summary of what was accomplished.

Context: ${JSON.stringify(context, null, 2)}`;

  const specializations: Record<AgentType, string> = {
    orchestrator: "\nYou coordinate all aspects of event planning, delegating to specialist tools and synthesizing results.",
    "venue-scout": "\nYou specialize in finding and evaluating venues. Search thoroughly, compare options, and recommend the best fit.",
    "vendor-coordinator": "\nYou specialize in finding vendors for event services. Match vendor capabilities to event requirements.",
    "volunteer-coordinator": "\nYou specialize in volunteer management. Match volunteer skills to shift requirements.",
    "permit-processor": "\nYou specialize in permit requirements. Identify all needed permits based on event type, location, and regulations.",
  };

  return base + (specializations[agentType] ?? "");
}

export class AgentRuntime {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
    this.client = new Anthropic({ apiKey });
  }

  async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const startTime = Date.now();
    const {
      agentType,
      eventId,
      actorId,
      task,
      context = {},
      maxTurns = 20,
      maxBudgetUsd = 5.0,
    } = options;

    const systemPrompt = buildSystemPrompt(agentType, { eventId, ...context });

    // Build tools from all domains
    const venueTools = createVenueTools(this.db, eventId);
    const bookingTools = createBookingTools(this.db, eventId);
    const eventTools = createEventTools(this.db);
    const vendorTools = createVendorTools(this.db);

    const allTools = [...venueTools, ...bookingTools, ...eventTools, ...vendorTools].map(
      (t) => betaZodTool(t),
    );

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let toolCallCount = 0;
    let finalResult = "";

    // toolRunner handles the full agentic loop (tool call → execute → feed back → repeat)
    // until stop_reason === "end_turn" or maxTurns is hit
    const finalMessage = await this.client.beta.messages.toolRunner({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      tools: allTools,
      messages: [{ role: "user", content: task }],
    });

    totalInputTokens = finalMessage.usage.input_tokens;
    totalOutputTokens = finalMessage.usage.output_tokens;
    toolCallCount = finalMessage.content.filter((b) => b.type === "tool_use").length;

    const textBlocks = finalMessage.content.filter(
      (b): b is Anthropic.Beta.BetaTextBlock => b.type === "text",
    );
    finalResult = textBlocks.map((b) => b.text).join("\n");

    const estimatedCostUsd = estimateCost(totalInputTokens, totalOutputTokens);
    const budgetExceeded = estimatedCostUsd >= maxBudgetUsd;
    const totalTurns = 1; // toolRunner manages turns internally

    const durationMs = Date.now() - startTime;

    // Log to audit trail
    await this.db.insert(auditLog).values({
      eventId,
      agentType,
      agentEntityId: actorId,
      action: "agent_run",
      input: { task, context, maxTurns, maxBudgetUsd } as unknown as Record<string, unknown>,
      output: {
        result: finalResult.slice(0, 1000), // truncate for storage
        turns: totalTurns,
        toolCallCount,
        budgetExceeded,
      } as unknown as Record<string, unknown>,
      durationMs,
      costUsd: estimatedCostUsd,
    });

    return {
      result: finalResult,
      turns: totalTurns,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCostUsd,
      durationMs,
      toolCallCount,
    };
  }
}
