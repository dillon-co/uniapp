import Anthropic from "@anthropic-ai/sdk";
import { eq, and, lt, desc } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { agentMemory } from "@uniapp/db";

export type MemoryType =
  | "booking_outcome"
  | "pricing_history"
  | "preference"
  | "reliability_score"
  | "capacity_pattern"
  | "negotiation_outcome"
  | "event_type_preference"
  | "general";

export interface Memory {
  id: string;
  entityType: string;
  entityId: string;
  memoryType: MemoryType;
  content: string;
  createdAt: Date;
}

// How long memories live before pruning (6 months)
const MEMORY_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export class MemoryStore {
  private db: Database;
  private client: Anthropic;

  constructor(db: Database) {
    this.db = db;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY required");
    this.client = new Anthropic({ apiKey });
  }

  /** Save a memory for an entity. Entity isolation is strict — entityId is always scoped. */
  async save(params: {
    entityType: string;
    entityId: string;
    memoryType: MemoryType;
    content: string;
  }): Promise<void> {
    await this.db.insert(agentMemory).values({
      entityType: params.entityType,
      entityId: params.entityId,
      memoryType: params.memoryType,
      content: params.content,
    });
  }

  /** Recall recent memories for an entity, optionally filtered by type. */
  async recall(params: {
    entityType: string;
    entityId: string;
    memoryType?: MemoryType;
    limit?: number;
  }): Promise<Memory[]> {
    const conditions = [
      eq(agentMemory.entityType, params.entityType),
      eq(agentMemory.entityId, params.entityId),
    ];
    if (params.memoryType) {
      conditions.push(eq(agentMemory.memoryType, params.memoryType));
    }

    const rows = await this.db.query.agentMemory.findMany({
      where: and(...conditions),
      orderBy: [desc(agentMemory.createdAt)],
      limit: params.limit ?? 20,
    });

    return rows as Memory[];
  }

  /**
   * Build a context string injected into agent system prompts.
   * Uses Claude to synthesize raw memories into actionable context.
   */
  async buildContext(params: {
    entityType: string;
    entityId: string;
    currentTask: string;
  }): Promise<string> {
    const memories = await this.recall({
      entityType: params.entityType,
      entityId: params.entityId,
      limit: 30,
    });

    if (memories.length === 0) {
      return `No prior memories found for ${params.entityType} ${params.entityId}.`;
    }

    const memorySummary = memories
      .map((m) => `[${m.memoryType} @ ${m.createdAt.toISOString().split("T")[0]}] ${m.content}`)
      .join("\n");

    const response = await this.client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `You are summarizing agent memories for ${params.entityType} entity.

Current task: ${params.currentTask}

Raw memories (newest first):
${memorySummary}

Synthesize the most relevant context for the current task in 3-5 bullet points.
Be specific — include prices, dates, patterns. Omit irrelevant entries.`,
      }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return textBlock?.text ?? memorySummary.slice(0, 500);
  }

  /** Record outcome memory after agent actions. */
  async recordBookingOutcome(params: {
    entityType: string;
    entityId: string;
    eventType: string;
    priceCents: number;
    outcome: "confirmed" | "rejected" | "countered" | "cancelled";
    notes?: string;
  }): Promise<void> {
    await this.save({
      entityType: params.entityType,
      entityId: params.entityId,
      memoryType: "booking_outcome",
      content: `Event type "${params.eventType}" — ${params.outcome} at $${(params.priceCents / 100).toLocaleString()}${params.notes ? ". " + params.notes : ""}`,
    });

    await this.save({
      entityType: params.entityType,
      entityId: params.entityId,
      memoryType: "pricing_history",
      content: `${params.outcome === "confirmed" ? "Accepted" : "Attempted"} rate: $${(params.priceCents / 100).toLocaleString()} for ${params.eventType} event`,
    });
  }

  /** Prune memories older than 6 months. Should run as a scheduled job. */
  async prune(): Promise<number> {
    const cutoff = new Date(Date.now() - MEMORY_TTL_MS);
    const deleted = await this.db
      .delete(agentMemory)
      .where(lt(agentMemory.createdAt, cutoff))
      .returning({ id: agentMemory.id });
    return deleted.length;
  }
}
