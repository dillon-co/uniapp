import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { vendors } from "@uniapp/db";
import { authenticate } from "../middleware/auth.js";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const createVendorSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(255),
  categories: z.array(z.string()).min(1),
  serviceArea: z.array(z.string()).default([]),
  pricingRange: z.object({
    minCents: z.number().int().min(0),
    maxCents: z.number().int().min(0),
    unit: z.enum(["hour", "day", "event"]).default("event"),
  }),
  portfolio: z.object({
    images: z.array(z.string()).default([]),
    pastEvents: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
  }).default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const searchSchema = z.object({
  category: z.string().optional(),
  cityId: z.string().uuid().optional(),
  maxPriceCents: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const vendorRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/v1/vendors
  app.post("/", { onRequest: [authenticate] }, async (request, reply) => {
    const body = createVendorSchema.parse(request.body);

    let slug = slugify(body.name);
    const existing = await app.db.query.vendors.findFirst({
      where: eq(vendors.slug, slug), columns: { id: true },
    });
    if (existing) slug = `${slug}-${Date.now()}`;

    const [vendor] = await app.db
      .insert(vendors)
      .values({ ...body, slug, metadata: body.metadata ?? {} })
      .returning();

    reply.status(201).send({ data: vendor });
  });

  // GET /api/v1/vendors/search
  app.get("/search", { onRequest: [authenticate] }, async (request) => {
    const query = searchSchema.parse(request.query);
    const conditions = [];

    if (query.category) {
      conditions.push(sql`${vendors.categories} @> ARRAY[${query.category}]::text[]`);
    }
    if (query.maxPriceCents) {
      conditions.push(
        sql`(${vendors.pricingRange}->>'minCents')::int <= ${query.maxPriceCents}`,
      );
    }

    const rows = await app.db.query.vendors.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: query.limit,
      orderBy: [desc(vendors.trustScore)],
    });

    return { data: rows };
  });

  // GET /api/v1/vendors/:id
  app.get<{ Params: { id: string } }>("/:id", { onRequest: [authenticate] }, async (request) => {
    const vendor = await app.db.query.vendors.findFirst({
      where: eq(vendors.id, request.params.id),
    });
    if (!vendor) throw app.httpErrors.notFound("Vendor not found");
    return { data: vendor };
  });

  // PATCH /api/v1/vendors/:id
  app.patch<{ Params: { id: string } }>("/:id", { onRequest: [authenticate] }, async (request) => {
    const { roles } = request.jwtPayload;
    if (!roles.includes("vendor") && !roles.includes("platform_admin")) {
      throw app.httpErrors.forbidden("Insufficient permissions");
    }

    const body = createVendorSchema.partial().omit({ orgId: true }).parse(request.body);
    const [updated] = await app.db
      .update(vendors)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(vendors.id, request.params.id))
      .returning();

    if (!updated) throw app.httpErrors.notFound("Vendor not found");
    return { data: updated };
  });
};
