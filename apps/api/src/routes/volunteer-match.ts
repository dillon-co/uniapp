import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { VolunteerAgent } from "@uniapp/agents";
import { authenticate } from "../middleware/auth.js";

export const volunteerMatchRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/events/:id/match-volunteers
  app.post<{ Params: { id: string } }>(
    "/:id/match-volunteers",
    { onRequest: [authenticate] },
    async (request, reply) => {
      const { roles, userId } = request.jwtPayload;
      if (!roles.includes("organizer") && !roles.includes("platform_admin")) {
        throw app.httpErrors.forbidden("Only organizers can trigger volunteer matching");
      }

      const agent = new VolunteerAgent(app.db);
      const results = await agent.matchAndAssign(request.params.id, userId);

      const totalMatched = results.reduce((sum, r) => sum + r.matchedVolunteers.length, 0);
      const totalUnfilled = results.reduce((sum, r) => sum + r.unfilledSlots, 0);

      // Broadcast via WebSocket
      app.broadcast(`event:${request.params.id}`, "volunteer_matching_complete", {
        totalShifts: results.length,
        totalMatched,
        totalUnfilled,
      });

      reply.send({
        data: results,
        meta: { totalShifts: results.length, totalMatched, totalUnfilled },
      });
    },
  );

  // POST /api/v1/volunteers/shifts/:id/track-hours
  app.post<{ Params: { id: string } }>(
    "/track-hours/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const { userId } = request.jwtPayload;
      const agent = new VolunteerAgent(app.db);
      const result = await agent.trackHours(userId, request.params.id);
      return { data: result };
    },
  );
};
