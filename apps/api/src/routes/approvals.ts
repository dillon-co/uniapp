import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { approvalGates, events } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const respondApprovalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
  modifications: z.record(z.string(), z.unknown()).optional(),
});

export const approvalRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/events/:id/approvals — list approval gates for an event
  app.get<{ Params: { id: string } }>(
    "/:id/approvals",
    { onRequest: [authenticate] },
    async (request) => {
      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.id),
        columns: { id: true, organizerId: true },
      });
      if (!event) throw app.httpErrors.notFound("Event not found");

      const { userId, roles } = request.jwtPayload;
      const isOwner = event.organizerId === userId;
      const isAdmin = roles.includes("platform_admin");
      if (!isOwner && !isAdmin) throw app.httpErrors.forbidden("Access denied");

      const gates = await app.db.query.approvalGates.findMany({
        where: eq(approvalGates.eventId, request.params.id),
        orderBy: [desc(approvalGates.requestedAt)],
      });

      const pendingCount = gates.filter((g) => g.status === "pending").length;
      return { data: gates, meta: { pendingCount } };
    },
  );

  // POST /api/v1/events/:id/approvals/:gateId/respond
  app.post<{ Params: { id: string; gateId: string } }>(
    "/:id/approvals/:gateId/respond",
    { onRequest: [authenticate] },
    async (request) => {
      const body = respondApprovalSchema.parse(request.body);
      const { userId } = request.jwtPayload;

      // Verify event ownership
      const event = await app.db.query.events.findFirst({
        where: eq(events.id, request.params.id),
        columns: { organizerId: true },
      });
      if (!event) throw app.httpErrors.notFound("Event not found");
      if (event.organizerId !== userId && !request.jwtPayload.roles.includes("platform_admin")) {
        throw app.httpErrors.forbidden("Only the event organizer can respond to approvals");
      }

      const gate = await app.db.query.approvalGates.findFirst({
        where: and(
          eq(approvalGates.id, request.params.gateId),
          eq(approvalGates.eventId, request.params.id),
        ),
      });
      if (!gate) throw app.httpErrors.notFound("Approval gate not found");
      if (gate.status !== "pending") {
        throw app.httpErrors.conflict(`Gate already ${gate.status}`);
      }

      const newStatus = body.action === "approve" ? "approved" : "rejected";

      // Merge organizer modifications into gate data if provided
      const updatedData = body.modifications
        ? { ...(gate.data as Record<string, unknown>), modifications: body.modifications }
        : gate.data;

      const [updated] = await app.db
        .update(approvalGates)
        .set({
          status: newStatus,
          respondedAt: new Date(),
          responderId: userId,
          note: body.note,
          data: updatedData as Record<string, unknown>,
        })
        .where(eq(approvalGates.id, gate.id))
        .returning();

      // Broadcast via WebSocket so agents waiting on this gate can resume
      app.broadcast(`event:${request.params.id}`, "approval_gate_resolved", {
        gateId: gate.id,
        type: gate.type,
        status: newStatus,
        note: body.note,
        modifications: body.modifications,
      });

      return { data: updated };
    },
  );

  // GET /api/v1/approvals/pending — all pending approvals for current user's events
  app.get("/pending", { onRequest: [authenticate] }, async (request) => {
    const { userId } = request.jwtPayload;

    const userEvents = await app.db.query.events.findMany({
      where: eq(events.organizerId, userId),
      columns: { id: true },
    });

    if (userEvents.length === 0) return { data: [], meta: { total: 0 } };

    const eventIds = userEvents.map((e) => e.id);
    const allGates: typeof approvalGates.$inferSelect[] = [];

    for (const eventId of eventIds) {
      const gates = await app.db.query.approvalGates.findMany({
        where: and(eq(approvalGates.eventId, eventId), eq(approvalGates.status, "pending")),
        orderBy: [desc(approvalGates.requestedAt)],
      });
      allGates.push(...gates);
    }

    return { data: allGates, meta: { total: allGates.length } };
  });
};
