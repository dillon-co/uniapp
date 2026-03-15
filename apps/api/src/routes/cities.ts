import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { cities } from "@uniapp/db";
import { authenticate, requireRoles } from "../middleware/auth.js";

const createCitySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  state: z.string().min(1).max(100),
  country: z.string().length(2).default("US"),
  timezone: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  permitConfig: z.record(z.string(), z.unknown()).optional(),
  regulatoryConfig: z.record(z.string(), z.unknown()).optional(),
});

const updateCitySchema = createCitySchema.partial().omit({ slug: true });

export const cityRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/v1/cities — public
  app.get("/", async (_request, reply) => {
    const allCities = await app.db.query.cities.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        state: true,
        country: true,
        timezone: true,
        latitude: true,
        longitude: true,
      },
    });

    return reply.send({ data: allCities });
  });

  // GET /api/v1/cities/:slug — public
  app.get<{ Params: { slug: string } }>("/:slug", async (request) => {
    const city = await app.db.query.cities.findFirst({
      where: eq(cities.slug, request.params.slug),
    });

    if (!city) throw app.httpErrors.notFound("City not found");
    return { data: city };
  });

  // POST /api/v1/cities — platform_admin only
  app.post(
    "/",
    { onRequest: [requireRoles("platform_admin")] },
    async (request, reply) => {
      const body = createCitySchema.parse(request.body);

      const existing = await app.db.query.cities.findFirst({
        where: eq(cities.slug, body.slug),
        columns: { id: true },
      });
      if (existing) throw app.httpErrors.conflict("City slug already taken");

      const [city] = await app.db
        .insert(cities)
        .values({
          ...body,
          permitConfig: body.permitConfig ?? {},
          regulatoryConfig: body.regulatoryConfig ?? {},
        })
        .returning();

      reply.status(201).send({ data: city });
    },
  );

  // PATCH /api/v1/cities/:id — platform_admin | city_admin
  app.patch<{ Params: { id: string } }>(
    "/:id",
    { onRequest: [authenticate] },
    async (request) => {
      const { roles, cityId } = request.jwtPayload;
      const isPlatformAdmin = roles.includes("platform_admin");
      const isCityAdmin =
        roles.includes("city_admin") && cityId === request.params.id;

      if (!isPlatformAdmin && !isCityAdmin) {
        throw app.httpErrors.forbidden("Insufficient permissions");
      }

      const body = updateCitySchema.parse(request.body);
      const [updated] = await app.db
        .update(cities)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(cities.id, request.params.id))
        .returning();

      if (!updated) throw app.httpErrors.notFound("City not found");
      return { data: updated };
    },
  );
};
