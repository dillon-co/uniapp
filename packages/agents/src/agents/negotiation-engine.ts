import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import type { Database } from "@uniapp/db";
import { negotiations } from "@uniapp/db";

export interface NegotiationRound {
  round: number;
  proposedBy: string;
  proposedAt: string;
  proposal: Record<string, unknown>;
  responseAt?: string;
  response?: Record<string, unknown>;
  status: "pending" | "countered" | "accepted" | "rejected";
}

export interface NegotiationProposal {
  priceCents: number;
  terms: Record<string, unknown>;
  notes?: string;
  validUntil?: string;
}

export class NegotiationEngine {
  private client: Anthropic;
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY required");
    this.client = new Anthropic({ apiKey });
  }

  async initiate(params: {
    eventId: string;
    initiatorId: string;
    initiatorType: string;
    responderId: string;
    responderType: string;
    subject: string;
    initialProposal: NegotiationProposal;
  }): Promise<{ negotiationId: string }> {
    const firstRound: NegotiationRound = {
      round: 1,
      proposedBy: params.initiatorId,
      proposedAt: new Date().toISOString(),
      proposal: params.initialProposal as unknown as Record<string, unknown>,
      status: "pending",
    };

    const [neg] = await this.db
      .insert(negotiations)
      .values({
        eventId: params.eventId,
        initiatorType: params.initiatorType,
        initiatorId: params.initiatorId,
        responderType: params.responderType,
        responderId: params.responderId,
        subject: params.subject,
        rounds: [firstRound],
        currentRound: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning({ id: negotiations.id });

    return { negotiationId: neg!.id };
  }

  async generateCounterProposal(negotiationId: string): Promise<NegotiationProposal> {
    const neg = await this.db.query.negotiations.findFirst({
      where: eq(negotiations.id, negotiationId),
    });
    if (!neg) throw new Error("Negotiation not found");

    const rounds = neg.rounds as NegotiationRound[];
    const latest = rounds.at(-1);
    if (!latest) throw new Error("No rounds found");

    const prompt = `You are an AI negotiation agent for a city event coordination platform.

Negotiation context:
- Subject: ${neg.subject}
- Responder type: ${neg.responderType}
- Current round: ${neg.currentRound} of ${neg.maxRounds}

Negotiation history:
${rounds.map((r) => `Round ${r.round}: ${JSON.stringify(r.proposal)} (${r.status})`).join("\n")}

Generate a fair counter-proposal. Consider:
- Market rates for this type of service
- The event context and urgency
- Progressive compromise (each round should move toward agreement)
- After round 7+, propose your best final offer

Respond with ONLY a valid JSON object matching:
{
  "priceCents": number,
  "terms": { [key: string]: unknown },
  "notes": string,
  "validUntil": "ISO date string (48 hours from now)"
}`;

    const response = await this.client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) throw new Error("No response from negotiation engine");

    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      return JSON.parse(jsonMatch[0]) as NegotiationProposal;
    } catch {
      throw new Error(`Failed to parse counter-proposal: ${textBlock.text.slice(0, 200)}`);
    }
  }

  async submitResponse(negotiationId: string, params: {
    responderId: string;
    action: "accept" | "reject" | "counter";
    response?: NegotiationProposal;
  }): Promise<{ status: string; resolved: boolean }> {
    const neg = await this.db.query.negotiations.findFirst({
      where: eq(negotiations.id, negotiationId),
    });
    if (!neg) throw new Error("Negotiation not found");
    if (neg.status !== "active") throw new Error(`Negotiation is ${neg.status}`);

    const rounds = neg.rounds as NegotiationRound[];
    const currentRound = rounds.find((r) => r.round === neg.currentRound);
    if (!currentRound) throw new Error("Current round not found");

    currentRound.responseAt = new Date().toISOString();
    currentRound.response = (params.response ?? {}) as Record<string, unknown>;
    currentRound.status = params.action === "counter" ? "countered" :
      params.action === "accept" ? "accepted" : "rejected";

    let newStatus = neg.status;
    let resolved = false;
    const updatedRounds = [...rounds];

    if (params.action === "accept") {
      newStatus = "resolved";
      resolved = true;
    } else if (params.action === "reject") {
      newStatus = "rejected";
      resolved = true;
    } else if (params.action === "counter") {
      if (neg.currentRound >= neg.maxRounds) {
        newStatus = "escalated";
        resolved = true;
      } else {
        // Add new round
        updatedRounds.push({
          round: neg.currentRound + 1,
          proposedBy: params.responderId,
          proposedAt: new Date().toISOString(),
          proposal: (params.response ?? {}) as Record<string, unknown>,
          status: "pending",
        });
      }
    }

    await this.db.update(negotiations).set({
      rounds: updatedRounds,
      status: newStatus,
      currentRound: params.action === "counter" && !resolved ? neg.currentRound + 1 : neg.currentRound,
      resolvedAt: resolved ? new Date() : null,
      outcome: params.action === "accept" ? (currentRound.proposal as unknown as Record<string, unknown>) : null,
      updatedAt: new Date(),
    }).where(eq(negotiations.id, negotiationId));

    return { status: newStatus, resolved };
  }
}
