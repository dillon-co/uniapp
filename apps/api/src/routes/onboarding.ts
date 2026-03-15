import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, cities } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const completeOnboardingSchema = z.object({
  roles: z.array(z.enum(["organizer", "venue_manager", "vendor", "volunteer", "attendee"])).min(1),
  cityId: z.string().uuid(),
  phone: z.string().max(20).optional(),
  preferences: z.object({
    eventTypes: z.array(z.string()).default([]),
    notificationsEnabled: z.boolean().default(true),
  }).optional(),
});

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/onboarding/complete — finalize user setup after registration
  app.post(
    "/complete",
    { onRequest: [authenticate] },
    async (request) => {
      const body = completeOnboardingSchema.parse(request.body);
      const { userId } = request.jwtPayload;

      // Verify city exists
      const city = await app.db.query.cities.findFirst({
        where: eq(cities.id, body.cityId),
        columns: { id: true, name: true },
      });
      if (!city) throw app.httpErrors.notFound("City not found");

      // Ensure "attendee" is always included
      const roles = [...new Set([...body.roles, "attendee"])];

      const [updated] = await app.db
        .update(users)
        .set({
          roles,
          cityId: body.cityId,
          phone: body.phone,
          preferences: {
            ...(body.preferences ?? {}),
            onboardingCompletedAt: new Date().toISOString(),
          } as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          roles: users.roles,
          cityId: users.cityId,
        });

      return {
        data: {
          user: updated,
          city: city.name,
          message: "Onboarding complete! Welcome to UniApp.",
        },
      };
    },
  );

  // GET /api/v1/onboarding/status
  app.get(
    "/status",
    { onRequest: [authenticate] },
    async (request) => {
      const user = await app.db.query.users.findFirst({
        where: eq(users.id, request.jwtPayload.userId),
        columns: { roles: true, cityId: true, preferences: true, phone: true },
      });

      const prefs = (user?.preferences ?? {}) as { onboardingCompletedAt?: string };
      const complete = !!(user?.cityId && prefs.onboardingCompletedAt);

      return {
        data: {
          complete,
          missingSteps: [
            !user?.cityId && "select_city",
            !(user?.roles?.length && user.roles.length > 1) && "select_roles",
            !prefs.onboardingCompletedAt && "complete_profile",
          ].filter(Boolean),
        },
      };
    },
  );
};
