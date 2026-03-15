import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).optional().nullable(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/users/me
  app.get("/me", { onRequest: [authenticate] }, async (request) => {
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, request.jwtPayload.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        cityId: true,
        preferences: true,
        trustScore: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw app.httpErrors.notFound("User not found");
    return { data: user };
  });

  // PATCH /api/v1/users/me
  app.patch("/me", { onRequest: [authenticate] }, async (request) => {
    const body = updateProfileSchema.parse(request.body);

    if (Object.keys(body).length === 0) {
      throw app.httpErrors.badRequest("No fields to update");
    }

    const [updated] = await app.db
      .update(users)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.jwtPayload.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        roles: users.roles,
        cityId: users.cityId,
        preferences: users.preferences,
        trustScore: users.trustScore,
        updatedAt: users.updatedAt,
      });

    return { data: updated };
  });

  // GET /api/v1/users/:id (admin / city_admin only)
  app.get<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const { roles } = request.jwtPayload;
      const isAdmin =
        roles.includes("platform_admin") || roles.includes("city_admin");
      if (!isAdmin) throw app.httpErrors.forbidden("Insufficient permissions");

      const user = await app.db.query.users.findFirst({
        where: eq(users.id, request.params.id),
        columns: {
          id: true,
          email: true,
          name: true,
          phone: true,
          roles: true,
          cityId: true,
          trustScore: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });

      if (!user) throw app.httpErrors.notFound("User not found");
      return { data: user };
    },
  );
};
